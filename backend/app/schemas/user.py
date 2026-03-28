from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProfileBase(BaseModel):
    full_name: str | None = None
    email: str
    preferred_language: str = "en"
    preferred_voice: str | None = None
    ui_theme: str = "system"


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    preferred_language: str | None = None
    preferred_voice: str | None = None
    ui_theme: str | None = None


class ProfileRead(ProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
