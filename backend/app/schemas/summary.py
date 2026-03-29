from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SummaryCreate(BaseModel):
    style: str = "concise"


class SummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    note_id: UUID
    summary_text: str
    model_used: str
    created_at: datetime
