from pydantic import BaseModel

from app.schemas.user import ProfileRead


class AuthClaims(BaseModel):
    sub: str
    email: str | None = None
    role: str | None = None


class AuthBootstrapResponse(BaseModel):
    access_token_subject: str
    profile: ProfileRead


class SignUpRequest(BaseModel):
    email: str
    password: str
    full_name: str | None = None
    preferred_language: str = "en"
    preferred_voice: str | None = None
    ui_theme: str = "system"


class LoginRequest(BaseModel):
    email: str
    password: str


class SessionTokens(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int
    expires_at: int | None = None


class AuthSessionResponse(BaseModel):
    user_id: str
    email: str | None = None
    profile: ProfileRead | None = None
    session: SessionTokens | None = None
    message: str


class LogoutResponse(BaseModel):
    message: str
