from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator


SpeechSourceType = Literal["note", "summary", "quiz", "text"]
VoiceGender = Literal["male", "female"]


class SpeechGenerateRequest(BaseModel):
    source_type: SpeechSourceType = "text"
    source_id: UUID | None = None
    text: str | None = None
    voice_id: str | None = None
    gender: VoiceGender | None = None
    mood: str | None = None
    language: str | None = None

    @model_validator(mode="after")
    def validate_input(self) -> "SpeechGenerateRequest":
        if self.source_type == "text" and not self.text:
            raise ValueError("text must be provided when source_type is 'text'.")
        if self.source_type != "text" and not self.source_id:
            raise ValueError("source_id must be provided when source_type is not 'text'.")
        return self


class RegistryOption(BaseModel):
    id: str
    label: str
    description: str
    metadata: dict[str, Any] | None = None


class AudioFileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    note_id: UUID | None
    owner_id: UUID
    voice_id: str
    provider: str
    file_path: str
    transcript: str | None
    language: str
    created_at: datetime
    public_url: str | None = None
