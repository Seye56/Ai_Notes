from dataclasses import dataclass
from typing import Any

from fastapi import Header, HTTPException, status
from jose import JWTError, jwt

from app.core.config import settings


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


def decode_supabase_jwt(token: str) -> dict[str, Any]:
    if not settings.supabase_jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_JWT_SECRET is not configured.",
        )

    try:
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
        ) from exc


def build_auth_context(token: str) -> AuthContext:
    payload = decode_supabase_jwt(token)
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
