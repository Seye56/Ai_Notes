from pydantic import BaseModel

from app.schemas.user import ProfileRead


class AuthClaims(BaseModel):
    sub: str
    email: str | None = None
    role: str | None = None


class AuthBootstrapResponse(BaseModel):
    access_token_subject: str
    profile: ProfileRead
