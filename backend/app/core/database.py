from collections.abc import Generator
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, create_engine
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


class UUIDPrimaryKeyMixin:
    id: Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class SoftDeleteMixin:
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


engine = create_engine(
    settings.supabase_db_url,
    echo=settings.database_echo,
    future=True,
    pool_pre_ping=True,
) if settings.supabase_db_url else None

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


def get_db() -> Generator:
    if engine is None:
        raise RuntimeError("SUPABASE_DB_URL is not configured.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
