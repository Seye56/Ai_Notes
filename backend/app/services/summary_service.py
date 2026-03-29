from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.summary import Summary
from app.models.user import Profile
from app.schemas.summary import SummaryCreate
from app.services.note_service import NoteService


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

        try:
            response = client.messages.create(
                model=settings.claude_model,
                max_tokens=max(1024, min(4096, len(text) * 2)),
                temperature=0.2,
                system="You create concise academic summaries and key points for note-taking apps.",
                messages=[{"role": "user", "content": prompt}],
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Summary provider error: {exc}",
            ) from exc

        summary_text = SummaryService._extract_text_from_claude_response(response)
        if not summary_text.strip():
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Summary provider returned empty content.",
            )
        return summary_text.strip()

    @staticmethod
    def _extract_text_from_claude_response(response: Any) -> str:
        parts: list[str] = []
        for block in getattr(response, "content", []) or []:
            text = getattr(block, "text", None)
            if text:
                parts.append(text)
        return "\n".join(parts)
