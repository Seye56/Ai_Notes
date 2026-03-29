from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_profile
from app.core.database import get_db
from app.models.user import Profile
from app.schemas.translation import TranslationCreate, TranslationRead
from app.services.translation_service import TranslationService

router = APIRouter(tags=["translations"])


@router.post(
    "/notes/{note_id}/translate",
    response_model=TranslationRead,
    status_code=status.HTTP_201_CREATED,
)
def translate_note(
    note_id: UUID,
    payload: TranslationCreate,
    db: Session = Depends(get_db),
    current_profile: Profile = Depends(get_current_profile),
) -> TranslationRead:
    translation = TranslationService.translate_note(
        db,
        current_profile,
        note_id,
        payload,
    )
    return TranslationRead.model_validate(translation)
