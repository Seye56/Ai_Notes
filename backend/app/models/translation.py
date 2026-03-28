from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, UUIDPrimaryKeyMixin


class Translation(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "translations"

    note_id: Mapped[str] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True)
    target_language: Mapped[str] = mapped_column(String(50), nullable=False)
    translated_content: Mapped[str] = mapped_column(Text, nullable=False)
    translation_type: Mapped[str] = mapped_column(String(20), default="text", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    note = relationship("Note", back_populates="translations")
