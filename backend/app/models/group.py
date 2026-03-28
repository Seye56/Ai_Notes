from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, UUIDPrimaryKeyMixin


class Group(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "groups"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_id: Mapped[str] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    default_language: Mapped[str] = mapped_column(String(50), default="en", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    owner = relationship("Profile", back_populates="groups_owned")
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    events = relationship("GroupNoteEvent", back_populates="group", cascade="all, delete-orphan")


class GroupMember(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "group_members"
    __table_args__ = (UniqueConstraint("group_id", "user_id", name="uq_group_members_group_user"),)

    group_id: Mapped[str] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(50), default="member", nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    group = relationship("Group", back_populates="members")
    user = relationship("Profile", back_populates="group_memberships")


class GroupNoteEvent(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "group_note_events"

    group_id: Mapped[str] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id: Mapped[str] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    original_language: Mapped[str] = mapped_column(String(50), nullable=False)
    translated_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    translated_language: Mapped[str | None] = mapped_column(String(50), nullable=True)
    event_type: Mapped[str] = mapped_column(String(50), default="live_note", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    group = relationship("Group", back_populates="events")
