from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_profile
from app.core.database import get_db
from app.models.user import Profile
from app.schemas.quiz import QuizCreate, QuizRead
from app.services.quiz_service import QuizService

router = APIRouter(tags=["quizzes"])


@router.post(
    "/notes/{note_id}/quiz",
    response_model=QuizRead,
    status_code=status.HTTP_201_CREATED,
)
def generate_quiz(
    note_id: UUID,
    payload: QuizCreate,
    db: Session = Depends(get_db),
    current_profile: Profile = Depends(get_current_profile),
) -> QuizRead:
    quiz = QuizService.generate_quiz(
        db,
        current_profile,
        note_id,
        payload,
    )
    return QuizRead.model_validate(quiz)
