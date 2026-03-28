from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.note import Note
from app.models.user import Profile
from app.schemas.note import NoteCreate, NoteUpdate


class NoteService:
    @staticmethod
    def _parse_note_uuid(note_id: str | UUID) -> UUID:
        if isinstance(note_id, UUID):
            return note_id
        return UUID(note_id)

    @staticmethod
    def create_note(db: Session, owner: Profile, payload: NoteCreate) -> Note:
        note = Note(
            owner_id=owner.id,
            title=payload.title,
            content=payload.content,
            source_language=payload.source_language,
            imported_file_path=payload.imported_file_path,
        )
        db.add(note)
        db.commit()
        db.refresh(note)
        return note

    @staticmethod
    def list_notes(db: Session, owner: Profile) -> list[Note]:
        stmt = (
            select(Note)
            .where(Note.owner_id == owner.id)
            .order_by(Note.updated_at.desc())
        )
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_note_or_404(db: Session, owner: Profile, note_id: str | UUID) -> Note:
        stmt = select(Note).where(
            Note.id == NoteService._parse_note_uuid(note_id),
            Note.owner_id == owner.id,
        )
        note = db.scalar(stmt)
        if note is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found.",
            )
        return note

    @staticmethod
    def update_note(
        db: Session,
        owner: Profile,
        note_id: str | UUID,
        payload: NoteUpdate,
    ) -> Note:
        note = NoteService.get_note_or_404(db, owner, note_id)
        updates = payload.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(note, field, value)

        db.add(note)
        db.commit()
        db.refresh(note)
        return note

    @staticmethod
    def delete_note(db: Session, owner: Profile, note_id: str | UUID) -> None:
        note = NoteService.get_note_or_404(db, owner, note_id)
        db.delete(note)
        db.commit()
