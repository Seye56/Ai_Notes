from datetime import datetime

from pydantic import BaseModel, ConfigDict, model_validator


class SpeechGenerateRequest(BaseModel):
    note_id: str | None = None
    text: str | None = None
    voice_id: str | None = None
    language: str = "en"

    @model_validator(mode="after")
    def validate_input(self) -> "SpeechGenerateRequest":
        if not self.note_id and not self.text:
            raise ValueError("Either note_id or text must be provided.")
        return self


class AudioFileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    note_id: str | None
    owner_id: str
    voice_id: str
    provider: str
    file_path: str
    transcript: str | None
    language: str
    created_at: datetime
    public_url: str | None = None
