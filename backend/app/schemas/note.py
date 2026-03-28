from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NoteCreate(BaseModel):
    title: str
    content: str
    source_language: str = "en"
    imported_file_path: str | None = None


class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    source_language: str | None = None
    imported_file_path: str | None = None


class NoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    owner_id: str
    title: str
    content: str
    source_language: str
    imported_file_path: str | None
    created_at: datetime
    updated_at: datetime
