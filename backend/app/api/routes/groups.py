from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_profile
from app.core.database import get_db
from app.models.user import Profile
from app.schemas.group import (
    GroupCreate,
    GroupEventCreate,
    GroupEventRead,
    GroupMemberAdd,
    GroupMemberRead,
    GroupPresenceRead,
    GroupPresenceUpdate,
    GroupRead,
)
from app.services.group_service import GroupService

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
def create_group(
    payload: GroupCreate,
    db: Session = Depends(get_db),
    current_profile: Profile = Depends(get_current_profile),
) -> GroupRead:
    group = GroupService.create_group(db, current_profile, payload)
    return GroupRead.model_validate(group)


@router.get("", response_model=list[GroupRead])
def list_groups(
    db: Session = Depends(get_db),
    current_profile: Profile = Depends(get_current_profile),
) -> list[GroupRead]:
    groups = GroupService.list_groups(db, current_profile)
    return [GroupRead.model_validate(group) for group in groups]


@router.get("/{group_id}/members", response_model=list[GroupMemberRead])
def list_group_members(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_profile: Profile = Depends(get_current_profile),
) -> list[GroupMemberRead]:
    members = GroupService.list_members(db, current_profile, group_id)
    return [GroupMemberRead.model_validate(member) for member in members]


@router.post(
    "/{group_id}/members",
    response_model=GroupMemberRead,
    status_code=status.HTTP_201_CREATED,
)
def add_group_member(
    group_id: UUID,
    payload: GroupMemberAdd,
    db: Session = Depends(get_db),
    current_profile: Profile = Depends(get_current_profile),
) -> GroupMemberRead:
    member = GroupService.add_member(db, current_profile, group_id, payload)
    return GroupMemberRead.model_validate(member)


@router.delete("/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_group_member(
    group_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_profile: Profile = Depends(get_current_profile),
) -> None:
    GroupService.remove_member(db, current_profile, group_id, user_id)


@router.get("/{group_id}/events", response_model=list[GroupEventRead])
def list_group_events(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_profile: Profile = Depends(get_current_profile),
) -> list[GroupEventRead]:
    events = GroupService.list_events(db, current_profile, group_id)
    return [GroupEventRead.model_validate(event) for event in events]


@router.post(
    "/{group_id}/events",
    response_model=GroupEventRead,
    status_code=status.HTTP_201_CREATED,
)
def create_group_event(
    group_id: UUID,
    payload: GroupEventCreate,
    db: Session = Depends(get_db),
    current_profile: Profile = Depends(get_current_profile),
) -> GroupEventRead:
    event = GroupService.create_event(db, current_profile, group_id, payload)
    return GroupEventRead.model_validate(event)


@router.get("/{group_id}/presence", response_model=list[GroupPresenceRead])
def list_group_presence(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_profile: Profile = Depends(get_current_profile),
) -> list[GroupPresenceRead]:
    presences = GroupService.list_presences(db, current_profile, group_id)
    return [GroupPresenceRead.model_validate(presence) for presence in presences]


@router.put("/{group_id}/presence", response_model=GroupPresenceRead)
def update_group_presence(
    group_id: UUID,
    payload: GroupPresenceUpdate,
    db: Session = Depends(get_db),
    current_profile: Profile = Depends(get_current_profile),
) -> GroupPresenceRead:
    presence = GroupService.upsert_presence(db, current_profile, group_id, payload)
    return GroupPresenceRead.model_validate(presence)


@router.delete("/{group_id}/presence", status_code=status.HTTP_204_NO_CONTENT)
def clear_group_presence(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_profile: Profile = Depends(get_current_profile),
) -> None:
    GroupService.clear_presence(db, current_profile, group_id)
