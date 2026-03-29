import json
import re
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.quiz import Quiz
from app.models.user import Profile
from app.schemas.quiz import QuizCreate, QuizQuestion
from app.services.note_service import NoteService


class QuizService:
    @staticmethod
    def generate_quiz(
        db: Session,
        owner: Profile,
        note_id: str | UUID,
        payload: QuizCreate,
    ) -> Quiz:
        note = NoteService.get_note_or_404(db, owner, note_id)
        questions = QuizService._generate_questions(
            text=note.content,
            source_language=note.source_language,
            difficulty=payload.difficulty,
            num_questions=payload.num_questions,
        )

        quiz = Quiz(
            note_id=note.id,
            questions_json=questions,
            difficulty=payload.difficulty,
        )
        db.add(quiz)
        db.commit()
        db.refresh(quiz)
        return quiz

    @staticmethod
    def _generate_questions(
        *,
        text: str,
        source_language: str | None,
        difficulty: str,
        num_questions: int,
    ) -> list[dict[str, Any]]:
        if not settings.claude_api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="CLAUDE_API_KEY is not configured.",
            )

        if not text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Note content is empty and cannot be turned into a quiz.",
            )

        if num_questions < 1 or num_questions > 20:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="num_questions must be between 1 and 20.",
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
            "Generate a quiz from the following study note.\n"
            f"Source language: {source_language or 'unknown'}\n"
            f"Difficulty: {difficulty}\n"
            f"Number of questions: {num_questions}\n\n"
            "Return ONLY valid JSON as an array.\n"
            "Each array item must have: question, options, answer, explanation.\n"
            "options must be an array of exactly 4 strings.\n"
            "answer must exactly match one option.\n\n"
            f"Note:\n{text}"
        )

        try:
            response = client.messages.create(
                model=settings.claude_model,
                max_tokens=max(1500, min(5000, len(text) * 3)),
                temperature=0.2,
                system="You create high-quality multiple-choice quizzes from study notes and return strict JSON only.",
                messages=[{"role": "user", "content": prompt}],
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Quiz provider error: {exc}",
            ) from exc

        raw_text = QuizService._extract_text_from_claude_response(response).strip()
        if not raw_text:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Quiz provider returned empty content.",
            )

        return QuizService._parse_quiz_json(raw_text)

    @staticmethod
    def _parse_quiz_json(raw_text: str) -> list[dict[str, Any]]:
        candidate_payloads = QuizService._extract_json_candidates(raw_text)
        parsed = None
        last_error: Exception | None = None
        for candidate in candidate_payloads:
            try:
                parsed = json.loads(candidate)
                break
            except json.JSONDecodeError as exc:
                last_error = exc

        if parsed is None:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Quiz provider returned invalid JSON.",
            ) from last_error

        if not isinstance(parsed, list) or not parsed:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Quiz provider returned an invalid quiz payload.",
            )

        validated_questions: list[dict[str, Any]] = []
        for item in parsed:
            try:
                question = QuizQuestion.model_validate(item)
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Quiz provider returned malformed quiz questions.",
                ) from exc

            if len(question.options) != 4:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Quiz provider returned questions without exactly 4 options.",
                )
            if question.answer not in question.options:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Quiz provider returned an answer that is not in the options list.",
                )
            validated_questions.append(question.model_dump())

        return validated_questions

    @staticmethod
    def _extract_json_candidates(raw_text: str) -> list[str]:
        cleaned = raw_text.strip()
        candidates = [cleaned]

        fenced_blocks = re.findall(r"```(?:json)?\s*(.*?)```", cleaned, flags=re.DOTALL | re.IGNORECASE)
        candidates.extend(block.strip() for block in fenced_blocks if block.strip())

        first_bracket = cleaned.find("[")
        last_bracket = cleaned.rfind("]")
        if first_bracket != -1 and last_bracket != -1 and last_bracket > first_bracket:
            candidates.append(cleaned[first_bracket:last_bracket + 1].strip())

        deduped: list[str] = []
        seen: set[str] = set()
        for candidate in candidates:
            if candidate and candidate not in seen:
                deduped.append(candidate)
                seen.add(candidate)
        return deduped

    @staticmethod
    def _extract_text_from_claude_response(response: Any) -> str:
        parts: list[str] = []
        for block in getattr(response, "content", []) or []:
            text = getattr(block, "text", None)
            if text:
                parts.append(text)
        return "\n".join(parts)
