from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, UUIDPrimaryKeyMixin


class Quiz(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "quizzes"

    note_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("notes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    questions_json: Mapped[list[dict]] = mapped_column(JSONB, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(50), default="medium", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    note = relationship("Note", back_populates="quizzes")
