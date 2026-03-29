from datetime import datetime
from uuid import UUID

from pydantic import AliasPath, BaseModel, ConfigDict, Field, model_validator


class GroupCreate(BaseModel):
    name: str
    default_language: str = "en"


class GroupRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    owner_id: UUID
    default_language: str
    created_at: datetime


class GroupMemberAdd(BaseModel):
    user_id: UUID | None = None
    email: str | None = None
    role: str = "member"

    @model_validator(mode="after")
    def validate_target(self) -> "GroupMemberAdd":
        if self.user_id is None and not self.email:
            raise ValueError("Either user_id or email must be provided.")
        return self


class GroupMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    group_id: UUID
    user_id: UUID
    role: str
    joined_at: datetime
    email: str | None = Field(default=None, validation_alias=AliasPath("user", "email"))
    full_name: str | None = Field(default=None, validation_alias=AliasPath("user", "full_name"))


class GroupEventCreate(BaseModel):
    original_text: str
    original_language: str
    translated_language: str | None = None
    event_type: str = "live_note"


class GroupEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    group_id: UUID
    sender_id: UUID
    original_text: str
    original_language: str
    translated_text: str | None
    translated_language: str | None
    event_type: str
    created_at: datetime


class GroupPresenceUpdate(BaseModel):
    cursor_position: int | None = None
    selection_start: int | None = None
    selection_end: int | None = None
    is_typing: bool = False


class GroupPresenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    group_id: UUID
    user_id: UUID
    cursor_position: int | None
    selection_start: int | None
    selection_end: int | None
    is_typing: bool
    last_seen: datetime
    updated_at: datetime


class GroupSocketEventCreate(BaseModel):
    original_text: str
    original_language: str
    event_type: str = "live_note"
