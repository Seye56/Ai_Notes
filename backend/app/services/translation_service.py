from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.translation import Translation
from app.models.user import Profile
from app.schemas.translation import TranslationCreate
from app.services.note_service import NoteService


class TranslationService:
    @staticmethod
    def translate_note(
        db: Session,
        owner: Profile,
        note_id: str | UUID,
        payload: TranslationCreate,
    ) -> Translation:
        note = NoteService.get_note_or_404(db, owner, note_id)
        translated_content = TranslationService._translate_text(
            text=note.content,
            source_language=note.source_language,
            target_language=payload.target_language,
        )

        translation = Translation(
            note_id=note.id,
            target_language=payload.target_language,
            translated_content=translated_content,
            translation_type=payload.translation_type,
        )
        db.add(translation)
        db.commit()
        db.refresh(translation)
        return translation

    @staticmethod
    def _translate_text(
        *,
        text: str,
        source_language: str | None,
        target_language: str,
    ) -> str:
        if not settings.claude_api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="CLAUDE_API_KEY is not configured.",
            )

        if not text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Note content is empty and cannot be translated.",
            )

        try:
            from anthropic import Anthropic
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Anthropic SDK is not installed.",
            ) from exc

        client = Anthropic(api_key=settings.claude_api_key)
        prompt = (
            "Translate the following note accurately.\n"
            f"Source language: {source_language or 'unknown'}\n"
            f"Target language: {target_language}\n\n"
            "Return only the translated text with no commentary.\n\n"
            f"Note:\n{text}"
        )

        try:
            response = client.messages.create(
                model=settings.claude_model,
                max_tokens=max(1024, min(4096, len(text) * 2)),
                temperature=0,
                system="You are a precise translation engine for study notes.",
                messages=[{"role": "user", "content": prompt}],
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Translation provider error: {exc}",
            ) from exc

        translated_text = TranslationService._extract_text_from_claude_response(response)
        if not translated_text.strip():
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Translation provider returned empty content.",
            )
        return translated_text.strip()

    @staticmethod
    def _extract_text_from_claude_response(response: Any) -> str:
        parts: list[str] = []
        for block in getattr(response, "content", []) or []:
            text = getattr(block, "text", None)
            if text:
                parts.append(text)
        return "\n".join(parts)
