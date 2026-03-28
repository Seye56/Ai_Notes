from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_profile
from app.core.database import get_db
from app.models.user import Profile
from app.schemas.note import NoteCreate, NoteRead, NoteUpdate
from app.services.note_service import NoteService

router = APIRouter(prefix="/notes", tags=["notes"])


@router.post("", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
def create_note(
    payload: NoteCreate,
    db: Session = Depends(get_db),
    current_profile: Profile = Depends(get_current_profile),
) -> NoteRead:
    note = NoteService.create_note(db, current_profile, payload)
    return NoteRead.model_validate(note)


@router.get("", response_model=list[NoteRead])
def list_notes(
    db: Session = Depends(get_db),
    current_profile: Profile = Depends(get_current_profile),
) -> list[NoteRead]:
    notes = NoteService.list_notes(db, current_profile)
    return [NoteRead.model_validate(note) for note in notes]


@router.get("/{note_id}", response_model=NoteRead)
def get_note(
    note_id: UUID,
    db: Session = Depends(get_db),
    current_profile: Profile = Depends(get_current_profile),
) -> NoteRead:
    note = NoteService.get_note_or_404(db, current_profile, note_id)
    return NoteRead.model_validate(note)


@router.patch("/{note_id}", response_model=NoteRead)
def update_note(
    note_id: UUID,
    payload: NoteUpdate,
    db: Session = Depends(get_db),
    current_profile: Profile = Depends(get_current_profile),
) -> NoteRead:
    note = NoteService.update_note(db, current_profile, note_id, payload)
    return NoteRead.model_validate(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: UUID,
    db: Session = Depends(get_db),
    current_profile: Profile = Depends(get_current_profile),
) -> Response:
    NoteService.delete_note(db, current_profile, note_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
