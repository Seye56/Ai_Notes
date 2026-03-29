import logging
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.summary import Summary
from app.models.user import Profile
from app.schemas.summary import SummaryCreate
from app.services.note_service import NoteService

logger = logging.getLogger(__name__)


class SummaryService:
    @staticmethod
    def summarize_note(
        db: Session,
        owner: Profile,
        note_id: str | UUID,
        payload: SummaryCreate,
    ) -> Summary:
        note = NoteService.get_note_or_404(db, owner, note_id)
        summary_text = SummaryService._generate_summary(
            text=note.content,
            source_language=note.source_language,
            style=payload.style,
        )

        summary = Summary(
            note_id=note.id,
            summary_text=summary_text,
            model_used=settings.claude_model,
        )
        db.add(summary)
        db.commit()
        db.refresh(summary)
        return summary

    @staticmethod
    def _generate_summary(
        *,
        text: str,
        source_language: str | None,
        style: str,
    ) -> str:
        if not settings.claude_api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="CLAUDE_API_KEY is not configured.",
            )

        if not text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Note content is empty and cannot be summarized.",
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
            "Summarize the following study note.\n"
            f"Source language: {source_language or 'unknown'}\n"
            f"Summary style: {style}\n\n"
            "Return a short summary followed by a 'Key Points:' section with bullet points.\n\n"
            f"Note:\n{text}"
        )

        provider_errors: list[str] = []

        for model_name in SummaryService._candidate_models():
            try:
                response = client.messages.create(
                    model=model_name,
                    max_tokens=max(1024, min(4096, len(text) * 2)),
                    temperature=0.2,
                    system="You create concise academic summaries and key points for note-taking apps.",
                    messages=[{"role": "user", "content": prompt}],
                )
                summary_text = SummaryService._extract_text_from_claude_response(response)
                if not summary_text.strip():
                    message = f"{model_name}: empty content"
                    provider_errors.append(message)
                    logger.warning("Summary generation returned empty content for model %s", model_name)
                    continue
                return summary_text.strip()
            except Exception as exc:
                message = f"{model_name}: {exc}"
                provider_errors.append(message)
                logger.exception("Summary generation failed for model %s", model_name)

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Summary provider error: {' | '.join(provider_errors)}",
        )

    @staticmethod
    def _extract_text_from_claude_response(response: Any) -> str:
        parts: list[str] = []
        for block in getattr(response, "content", []) or []:
            text = getattr(block, "text", None)
            if text:
                parts.append(text)
        return "\n".join(parts)

    @staticmethod
    def _candidate_models() -> list[str]:
        ordered = [settings.claude_model, *settings.claude_fallback_models]
        seen: set[str] = set()
        candidates: list[str] = []
        for model_name in ordered:
            if not model_name or model_name in seen:
                continue
            seen.add(model_name)
            candidates.append(model_name)
        return candidates
