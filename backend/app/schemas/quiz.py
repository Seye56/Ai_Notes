from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class QuizCreate(BaseModel):
    note_id: str
    difficulty: str = "medium"
    num_questions: int = 5


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    answer: str
    explanation: str | None = None


class QuizRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    note_id: str
    questions_json: list[dict[str, Any]]
    difficulty: str
    created_at: datetime
