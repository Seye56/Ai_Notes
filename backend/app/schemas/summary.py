from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SummaryCreate(BaseModel):
    note_id: str
    style: str = "concise"


class SummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    note_id: str
    summary_text: str
    model_used: str
    created_at: datetime
