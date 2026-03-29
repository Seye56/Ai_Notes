from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_profile
from app.core.database import get_db
from app.models.user import Profile
from app.schemas.audio import AudioFileRead, RegistryOption, SpeechGenerateRequest
from app.services.elevenlabs_service import ElevenLabsService

router = APIRouter(prefix="/speech", tags=["speech"])


@router.get("/voices", response_model=list[RegistryOption])
def list_voices() -> list[RegistryOption]:
    return ElevenLabsService.list_voices()


@router.get("/moods", response_model=list[RegistryOption])
def list_moods() -> list[RegistryOption]:
    return ElevenLabsService.list_moods()


@router.post("/generate", response_model=AudioFileRead, status_code=status.HTTP_201_CREATED)
def generate_speech(
    payload: SpeechGenerateRequest,
    db: Session = Depends(get_db),
    current_profile: Profile = Depends(get_current_profile),
) -> AudioFileRead:
    audio_file, public_url = ElevenLabsService.generate_audio(db, current_profile, payload)
    response = AudioFileRead.model_validate(audio_file)
    response.public_url = public_url
    return response
