from uuid import UUID

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin


class Profile(TimestampMixin, Base):
    __tablename__ = "profiles"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    preferred_language: Mapped[str] = mapped_column(String(50), default="en", nullable=False)
    preferred_voice: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ui_theme: Mapped[str] = mapped_column(String(50), default="system", nullable=False)

    notes = relationship("Note", back_populates="owner", cascade="all, delete-orphan")
    audio_files = relationship("AudioFile", back_populates="owner")
    groups_owned = relationship("Group", back_populates="owner")
    group_memberships = relationship("GroupMember", back_populates="user")
