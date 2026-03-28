from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import AuthContext
from app.core.supabase import create_supabase_admin_client, create_supabase_anon_client
from app.models.user import Profile
from app.schemas.auth import AuthSessionResponse, LoginRequest, SessionTokens, SignUpRequest
from app.schemas.user import ProfileUpdate


class AuthService:
    @staticmethod
    def get_profile_by_id(db: Session, user_id: str) -> Profile | None:
        return db.get(Profile, user_id)

    @staticmethod
    def bootstrap_profile(db: Session, auth: AuthContext) -> Profile:
        profile = AuthService.get_profile_by_id(db, auth.user_id)
        claims = auth.claims
        user_metadata = claims.get("user_metadata") or {}

        if profile:
            profile.email = auth.email or profile.email
            profile.full_name = user_metadata.get("full_name") or profile.full_name
            preferred_language = user_metadata.get("preferred_language")
            preferred_voice = user_metadata.get("preferred_voice")
            ui_theme = user_metadata.get("ui_theme")
            if preferred_language:
                profile.preferred_language = preferred_language
            if preferred_voice:
                profile.preferred_voice = preferred_voice
            if ui_theme:
                profile.ui_theme = ui_theme
            db.add(profile)
            db.commit()
            db.refresh(profile)
            return profile

        email = auth.email or claims.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Authenticated user is missing an email address.",
            )

        profile = Profile(
            id=auth.user_id,
            email=email,
            full_name=user_metadata.get("full_name"),
            preferred_language=user_metadata.get("preferred_language", "en"),
            preferred_voice=user_metadata.get("preferred_voice"),
            ui_theme=user_metadata.get("ui_theme", "system"),
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile

    @staticmethod
    def require_profile(db: Session, auth: AuthContext) -> Profile:
        profile = AuthService.get_profile_by_id(db, auth.user_id)
        if profile is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found. Call /api/auth/bootstrap first.",
            )
        return profile

    @staticmethod
    def update_profile(db: Session, profile: Profile, payload: ProfileUpdate) -> Profile:
        updates: dict[str, Any] = payload.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(profile, field, value)

        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile

    @staticmethod
    def _ensure_profile_from_supabase_user(
        db: Session,
        *,
        user_id: str,
        email: str | None,
        user_metadata: dict[str, Any] | None = None,
    ) -> Profile | None:
        if not email:
            return None

        metadata = user_metadata or {}
        profile = AuthService.get_profile_by_id(db, user_id)
        if profile is None:
            profile = Profile(
                id=user_id,
                email=email,
                full_name=metadata.get("full_name"),
                preferred_language=metadata.get("preferred_language", "en"),
                preferred_voice=metadata.get("preferred_voice"),
                ui_theme=metadata.get("ui_theme", "system"),
            )
        else:
            profile.email = email
            profile.full_name = metadata.get("full_name") or profile.full_name
            profile.preferred_language = metadata.get("preferred_language", profile.preferred_language)
            profile.preferred_voice = metadata.get("preferred_voice", profile.preferred_voice)
            profile.ui_theme = metadata.get("ui_theme", profile.ui_theme)

        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile

    @staticmethod
    def sign_up(db: Session, payload: SignUpRequest) -> AuthSessionResponse:
        client = create_supabase_anon_client()
        try:
            response = client.auth.sign_up(
                {
                    "email": payload.email,
                    "password": payload.password,
                    "options": {
                        "data": {
                            "full_name": payload.full_name,
                            "preferred_language": payload.preferred_language,
                            "preferred_voice": payload.preferred_voice,
                            "ui_theme": payload.ui_theme,
                        }
                    },
                }
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Signup failed: {exc}",
            ) from exc

        if response.user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Supabase signup did not return a user.",
            )

        profile = AuthService._ensure_profile_from_supabase_user(
            db,
            user_id=response.user.id,
            email=response.user.email,
            user_metadata=response.user.user_metadata,
        )
        session = (
            SessionTokens(
                access_token=response.session.access_token,
                refresh_token=response.session.refresh_token,
                token_type=response.session.token_type,
                expires_in=response.session.expires_in,
                expires_at=response.session.expires_at,
            )
            if response.session
            else None
        )
        message = (
            "Signup successful."
            if session
            else "Signup successful. Email verification may be required before login."
        )
        return AuthSessionResponse(
            user_id=response.user.id,
            email=response.user.email,
            profile=profile and profile,
            session=session,
            message=message,
        )

    @staticmethod
    def log_in(db: Session, payload: LoginRequest) -> AuthSessionResponse:
        client = create_supabase_anon_client()
        try:
            response = client.auth.sign_in_with_password(
                {"email": payload.email, "password": payload.password}
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Login failed: {exc}",
            ) from exc

        if response.user is None or response.session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Supabase login did not return an active session.",
            )

        profile = AuthService._ensure_profile_from_supabase_user(
            db,
            user_id=response.user.id,
            email=response.user.email,
            user_metadata=response.user.user_metadata,
        )
        return AuthSessionResponse(
            user_id=response.user.id,
            email=response.user.email,
            profile=profile,
            session=SessionTokens(
                access_token=response.session.access_token,
                refresh_token=response.session.refresh_token,
                token_type=response.session.token_type,
                expires_in=response.session.expires_in,
                expires_at=response.session.expires_at,
            ),
            message="Login successful.",
        )

    @staticmethod
    def log_out(access_token: str) -> None:
        admin_client = create_supabase_admin_client()
        try:
            admin_client.auth.admin.sign_out(access_token)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Logout failed: {exc}",
            ) from exc
