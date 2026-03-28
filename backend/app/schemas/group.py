from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GroupCreate(BaseModel):
    name: str
    default_language: str = "en"


class GroupRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    owner_id: str
    default_language: str
    created_at: datetime


class GroupMemberAdd(BaseModel):
    user_id: str
    role: str = "member"


class GroupMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    group_id: str
    user_id: str
    role: str
    joined_at: datetime


class GroupEventCreate(BaseModel):
    original_text: str
    original_language: str
    translated_language: str | None = None
    event_type: str = "live_note"


class GroupEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    group_id: str
    sender_id: str
    original_text: str
    original_language: str
    translated_text: str | None
    translated_language: str | None
    event_type: str
    created_at: datetime
