from datetime import datetime, timezone
from uuid import UUID, uuid4

import httpx
from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.supabase import create_supabase_admin_client
from app.models.audio import AudioFile
from app.models.note import Note
from app.models.quiz import Quiz
from app.models.summary import Summary
from app.models.user import Profile
from app.schemas.audio import RegistryOption, SpeechGenerateRequest
from app.services.note_service import NoteService


VOICE_REGISTRY: dict[str, dict[str, str]] = {
    "default_female": {
        "voice_id": settings.elevenlabs_default_voice_id,
        "label": "Default Female",
        "description": "Default female voice for everyday playback.",
        "gender": "female",
    },
    "default_male": {
        "voice_id": "onwK4e9ZLuTAKqWW03F9",
        "label": "Default Male",
        "description": "Default male voice for everyday playback.",
        "gender": "male",
    },
    "warm_female": {
        "voice_id": "EXAVITQu4vr4xnSDxMaL",
        "label": "Warm Female",
        "description": "Friendly, balanced female narration voice.",
        "gender": "female",
    },
    "warm_male": {
        "voice_id": "onwK4e9ZLuTAKqWW03F9",
        "label": "Warm Male",
        "description": "Friendly, balanced male narration voice.",
        "gender": "male",
    },
    "narration_female": {
        "voice_id": "tl7lnnI5ADFNMMxMdzil",
        "label": "Narration Female",
        "description": "Female voice tuned for narration playback.",
        "gender": "female",
    },
    "narration_male": {
        "voice_id": "VsQmyFHffusQDewmHB5v",
        "label": "Narration Male",
        "description": "Male voice tuned for narration playback.",
        "gender": "male",
    },
    "quiz_male": {
        "voice_id": "xKhbyU7E3bC6T89Kn26c",
        "label": "Quiz Male",
        "description": "Male voice optimized for quiz playback.",
        "gender": "male",
    },
    "quiz_female": {
        "voice_id": "DODLEQrClDo8wCz460ld",
        "label": "Quiz Female",
        "description": "Female voice optimized for quiz playback.",
        "gender": "female",
    },
}

MOOD_REGISTRY: dict[str, dict[str, object]] = {
    "normal": {
        "label": "Normal",
        "description": "Balanced delivery for general listening.",
        "model_id": settings.elevenlabs_narration_model,
        "voice_settings": {
            "stability": 0.55,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True,
        },
    },
    "interactive": {
        "label": "Interactive",
        "description": "Faster response style for quick playback.",
        "model_id": settings.elevenlabs_interactive_model,
        "voice_settings": {
            "stability": 0.45,
            "similarity_boost": 0.65,
            "style": 0.1,
            "use_speaker_boost": True,
        },
    },
    "narration": {
        "label": "Narration",
        "description": "Smoother voice for long-form listening.",
        "model_id": settings.elevenlabs_narration_model,
        "voice_settings": {
            "stability": 0.7,
            "similarity_boost": 0.8,
            "style": 0.15,
            "use_speaker_boost": True,
        },
    },
}


class ElevenLabsService:
    @staticmethod
    def list_voices() -> list[RegistryOption]:
        return [
            RegistryOption(
                id=key,
                label=value["label"],
                description=value["description"],
                metadata={"voice_id": value["voice_id"], "gender": value["gender"]},
            )
            for key, value in VOICE_REGISTRY.items()
        ]

    @staticmethod
    def list_moods() -> list[RegistryOption]:
        return [
            RegistryOption(
                id=key,
                label=value["label"],
                description=value["description"],
                metadata={"model_id": value["model_id"]},
            )
            for key, value in MOOD_REGISTRY.items()
        ]

    @staticmethod
    def generate_audio(
        db: Session,
        owner: Profile,
        payload: SpeechGenerateRequest,
    ) -> tuple[AudioFile, str | None]:
        text, related_note_id = ElevenLabsService._resolve_source_text(db, owner, payload)
        language = payload.language or owner.preferred_language or settings.elevenlabs_default_language
        mood_id = payload.mood or settings.elevenlabs_default_mood
        mood = ElevenLabsService._resolve_mood(mood_id)
        voice_id = ElevenLabsService._resolve_voice_id(
            requested_voice=payload.voice_id,
            preferred_voice=owner.preferred_voice,
            gender=payload.gender,
            source_type=payload.source_type,
        )

        audio_bytes = ElevenLabsService._request_tts_audio(
            text=text,
            voice_id=voice_id,
            model_id=str(mood["model_id"]),
            voice_settings=dict(mood["voice_settings"]),
            language=language,
        )
        file_path = ElevenLabsService._upload_audio(owner.id, audio_bytes)

        audio_file = AudioFile(
            note_id=related_note_id,
            owner_id=owner.id,
            voice_id=voice_id,
            provider="elevenlabs",
            file_path=file_path,
            transcript=text,
            language=language,
        )
        db.add(audio_file)
        db.commit()
        db.refresh(audio_file)
        return audio_file, ElevenLabsService._build_audio_url(file_path)

    @staticmethod
    def _resolve_source_text(
        db: Session,
        owner: Profile,
        payload: SpeechGenerateRequest,
    ) -> tuple[str, UUID | None]:
        if payload.source_type == "text":
            return payload.text or "", None

        source_id = payload.source_id
        if source_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="source_id is required for non-text speech generation.",
            )

        if payload.source_type == "note":
            note = NoteService.get_note_or_404(db, owner, source_id)
            return note.content, note.id

        if payload.source_type == "summary":
            stmt = select(Summary).where(Summary.id == source_id).order_by(desc(Summary.created_at))
            summary = db.scalar(stmt)
            if summary is None:
                raise HTTPException(status_code=404, detail="Summary not found.")
            note = NoteService.get_note_or_404(db, owner, summary.note_id)
            return summary.summary_text, note.id

        if payload.source_type == "quiz":
            quiz = db.scalar(select(Quiz).where(Quiz.id == source_id))
            if quiz is None:
                raise HTTPException(status_code=404, detail="Quiz not found.")
            note = NoteService.get_note_or_404(db, owner, quiz.note_id)
            return ElevenLabsService._format_quiz_for_speech(quiz.questions_json), note.id

        raise HTTPException(status_code=400, detail="Unsupported source_type.")

    @staticmethod
    def _format_quiz_for_speech(questions_json: list[dict]) -> str:
        lines: list[str] = []
        for index, question in enumerate(questions_json, start=1):
            lines.append(f"Question {index}. {question.get('question', '')}")
            for option_index, option in enumerate(question.get("options", []), start=1):
                lines.append(f"Option {option_index}. {option}")
            answer = question.get("answer")
            if answer:
                lines.append(f"Answer: {answer}")
            explanation = question.get("explanation")
            if explanation:
                lines.append(f"Explanation: {explanation}")
            lines.append("")
        return "\n".join(lines).strip()

    @staticmethod
    def _resolve_voice_id(
        *,
        requested_voice: str | None,
        preferred_voice: str | None,
        gender: str | None,
        source_type: str,
    ) -> str:
        if ElevenLabsService._is_valid_voice_choice(requested_voice):
            candidate = requested_voice
        elif ElevenLabsService._is_valid_voice_choice(preferred_voice):
            candidate = preferred_voice
        elif source_type == "quiz":
            candidate = "quiz_male" if gender == "male" else "quiz_female"
        elif gender == "male":
            candidate = "default_male"
        else:
            candidate = "default_female"

        registry_match = VOICE_REGISTRY.get(candidate)
        if registry_match:
            return registry_match["voice_id"]
        return candidate

    @staticmethod
    def _is_valid_voice_choice(value: str | None) -> bool:
        if value is None:
            return False
        normalized = value.strip()
        if not normalized:
            return False
        if normalized.lower() in {"string", "default", "none", "null"}:
            return False
        return True

    @staticmethod
    def _resolve_mood(mood_id: str) -> dict[str, object]:
        mood = MOOD_REGISTRY.get(mood_id)
        if mood is None:
            raise HTTPException(status_code=400, detail=f"Unsupported mood '{mood_id}'.")
        return mood

    @staticmethod
    def _request_tts_audio(
        *,
        text: str,
        voice_id: str,
        model_id: str,
        voice_settings: dict[str, object],
        language: str,
    ) -> bytes:
        if not settings.elevenlabs_api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ELEVENLABS_API_KEY is not configured.",
            )

        try:
            response = httpx.post(
                f"{settings.elevenlabs_base_url}/text-to-speech/{voice_id}",
                headers={
                    "xi-api-key": settings.elevenlabs_api_key,
                    "Content-Type": "application/json",
                    "Accept": "audio/mpeg",
                },
                json={
                    "text": text,
                    "model_id": model_id,
                    "voice_settings": voice_settings,
                    "language_code": language,
                },
                timeout=60.0,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"ElevenLabs request failed: {exc}",
            ) from exc
        return response.content

    @staticmethod
    def _upload_audio(owner_id: UUID, audio_bytes: bytes) -> str:
        bucket = settings.supabase_audio_bucket
        path = f"{owner_id}/{datetime.now(timezone.utc).strftime('%Y/%m/%d')}/{uuid4()}.mp3"
        client = create_supabase_admin_client()
        try:
            client.storage.from_(bucket).upload(
                path,
                audio_bytes,
                {"content-type": "audio/mpeg"},
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Audio upload failed: {exc}",
            ) from exc
        return path

    @staticmethod
    def _build_audio_url(path: str) -> str | None:
        client = create_supabase_admin_client()
        try:
            response = client.storage.from_(settings.supabase_audio_bucket).create_signed_url(
                path,
                settings.supabase_signed_url_expires_in,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Audio URL generation failed: {exc}",
            ) from exc

        signed_url = response.get("signedURL") or response.get("signedUrl")
        if not signed_url:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Audio URL generation failed: missing signed URL in storage response.",
            )
        return signed_url
