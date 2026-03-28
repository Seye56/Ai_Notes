from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Note(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "notes"

    owner_id: Mapped[str] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    source_language: Mapped[str] = mapped_column(String(50), default="en", nullable=False)
    imported_file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    owner = relationship("Profile", back_populates="notes")
    translations = relationship("Translation", back_populates="note", cascade="all, delete-orphan")
    summaries = relationship("Summary", back_populates="note", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="note", cascade="all, delete-orphan")
    audio_files = relationship("AudioFile", back_populates="note")
