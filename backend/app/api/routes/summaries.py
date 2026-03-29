from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_profile
from app.core.database import get_db
from app.models.user import Profile
from app.schemas.summary import SummaryCreate, SummaryRead
from app.services.summary_service import SummaryService

router = APIRouter(tags=["summaries"])


@router.post(
    "/notes/{note_id}/summarize",
    response_model=SummaryRead,
    status_code=status.HTTP_201_CREATED,
)
def summarize_note(
    note_id: UUID,
    payload: SummaryCreate,
    db: Session = Depends(get_db),
    current_profile: Profile = Depends(get_current_profile),
) -> SummaryRead:
    summary = SummaryService.summarize_note(
        db,
        current_profile,
        note_id,
        payload,
    )
    return SummaryRead.model_validate(summary)
