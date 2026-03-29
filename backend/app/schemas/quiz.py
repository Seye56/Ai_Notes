from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class QuizCreate(BaseModel):
    difficulty: str = "medium"
    num_questions: int = 5


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    answer: str
    explanation: str | None = None


class QuizSpeakRequest(BaseModel):
    voice_id: str | None = None
    gender: Literal["male", "female"] | None = None
    mood: str | None = "interactive"
    language: str | None = None


class QuizRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    note_id: UUID
    questions_json: list[dict[str, Any]]
    difficulty: str
    created_at: datetime
