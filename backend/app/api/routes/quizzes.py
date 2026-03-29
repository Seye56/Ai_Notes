from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_profile
from app.core.database import get_db
from app.models.user import Profile
from app.schemas.audio import AudioFileRead, SpeechGenerateRequest
from app.schemas.quiz import QuizCreate, QuizRead, QuizSpeakRequest
from app.services.elevenlabs_service import ElevenLabsService
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


@router.post(
    "/quizzes/{quiz_id}/speak",
    response_model=AudioFileRead,
    status_code=status.HTTP_201_CREATED,
)
def speak_quiz(
    quiz_id: UUID,
    payload: QuizSpeakRequest,
    db: Session = Depends(get_db),
    current_profile: Profile = Depends(get_current_profile),
) -> AudioFileRead:
    quiz = QuizService.get_quiz_or_404(db, current_profile, quiz_id)
    speech_payload = SpeechGenerateRequest(
        source_type="quiz",
        source_id=quiz.id,
        voice_id=payload.voice_id,
        gender=payload.gender,
        mood=payload.mood,
        language=payload.language,
    )
    audio_file, public_url = ElevenLabsService.generate_audio(db, current_profile, speech_payload)
    response = AudioFileRead.model_validate(audio_file)
    response.public_url = public_url
    return response
