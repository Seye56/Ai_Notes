from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import AuthContext
from app.models.user import Profile
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
