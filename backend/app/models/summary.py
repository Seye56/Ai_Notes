from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, UUIDPrimaryKeyMixin


class Summary(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "summaries"

    note_id: Mapped[str] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True)
    summary_text: Mapped[str] = mapped_column(Text, nullable=False)
    model_used: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    note = relationship("Note", back_populates="summaries")
