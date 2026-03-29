from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


TranslationType = Literal["text", "spoken", "live"]


class TranslationCreate(BaseModel):
    target_language: str
    translation_type: TranslationType = "text"


class TextTranslationRequest(BaseModel):
    text: str
    source_language: str | None = None
    target_language: str
    translation_type: TranslationType = "text"


class TranslationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    note_id: UUID
    target_language: str
    translated_content: str
    translation_type: str
    created_at: datetime
