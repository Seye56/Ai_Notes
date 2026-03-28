from dataclasses import dataclass
from typing import Any

from fastapi import Header, HTTPException, status

from app.core.supabase import create_supabase_anon_client


@dataclass(slots=True)
class AuthContext:
    user_id: str
    email: str | None
    claims: dict[str, Any]
    access_token: str


def get_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header.",
        )

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header.",
        )
    return token


def fetch_supabase_user_claims(token: str) -> dict[str, Any]:
    client = create_supabase_anon_client()
    try:
        user_response = client.auth.get_user(token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
        ) from exc

    user = getattr(user_response, "user", None) if user_response else None
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
        )

    return {
        "sub": user.id,
        "email": user.email,
        "app_metadata": user.app_metadata,
        "user_metadata": user.user_metadata,
        "role": user.role,
    }


def build_auth_context(token: str) -> AuthContext:
    payload = fetch_supabase_user_claims(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing subject.",
        )
    return AuthContext(
        user_id=user_id,
        email=payload.get("email"),
        claims=payload,
        access_token=token,
    )


def get_auth_context_from_header(
    authorization: str | None = Header(default=None),
) -> AuthContext:
    token = get_bearer_token(authorization)
    return build_auth_context(token)
