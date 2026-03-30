from uuid import UUID

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_profile
from app.core.database import SessionLocal, get_db
from app.core.security import build_auth_context, get_bearer_token
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
    GroupSocketEventCreate,
)
from app.services.auth_service import AuthService
from app.services.group_service import GroupService, group_socket_manager

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
    events = GroupService.list_events_for_viewer(db, current_profile, group_id)
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


@router.websocket("/{group_id}/ws")
async def group_socket(
    websocket: WebSocket,
    group_id: UUID,
) -> None:
    token = websocket.query_params.get("token")
    if not token:
        try:
            token = get_bearer_token(websocket.headers.get("authorization"))
        except Exception:
            token = None

    if not token:
        await websocket.close(code=1008, reason="Missing access token.")
        return

    try:
        auth = build_auth_context(token)
    except Exception:
        await websocket.close(code=1008, reason="Invalid access token.")
        return

    db = SessionLocal()
    current_profile: Profile | None = None
    group = None
    socket_language = None

    try:
        current_profile = AuthService.require_profile(db, auth)
        group = GroupService.get_group_or_404(db, current_profile, group_id)
        socket_language = GroupService.resolve_socket_language(
            db,
            group,
            current_profile,
            websocket.query_params.get("language"),
        )

        await group_socket_manager.connect(group.id, current_profile, websocket, socket_language)
        initial_presence = GroupService.upsert_presence(
            db,
            current_profile,
            group.id,
            GroupPresenceUpdate(),
        )
        await websocket.send_json(
            {
                "type": "connected",
                "group_id": str(group.id),
                "user_id": str(current_profile.id),
                "language": socket_language,
            }
        )
        await group_socket_manager.send_presence_snapshot(
            websocket,
            GroupService.list_presences(db, current_profile, group.id),
        )
        await group_socket_manager.broadcast_presence_update(group.id, initial_presence)

        while True:
            incoming = await websocket.receive_json()
            message_type = incoming.get("type", "group_note_event")

            if message_type == "presence_update":
                payload = GroupPresenceUpdate.model_validate(
                    {
                        "cursor_position": incoming.get("cursor_position"),
                        "selection_start": incoming.get("selection_start"),
                        "selection_end": incoming.get("selection_end"),
                        "is_typing": incoming.get("is_typing", False),
                    }
                )
                presence = GroupService.upsert_presence(db, current_profile, group.id, payload)
                await group_socket_manager.broadcast_presence_update(group.id, presence)
                continue

            payload = GroupSocketEventCreate.model_validate(
                {
                    "original_text": incoming.get("original_text"),
                    "original_language": incoming.get("original_language"),
                    "event_type": incoming.get("event_type", "live_note"),
                }
            )
            group, event = GroupService.create_socket_event(db, current_profile, group.id, payload)
            await group_socket_manager.broadcast_group_event(db, group, event)
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        if websocket.client_state.name == "CONNECTED":
            await websocket.send_json(
                {
                    "type": "error",
                    "detail": str(exc),
                }
            )
    finally:
        if current_profile and group:
            group_socket_manager.disconnect(group.id, current_profile.id, websocket)
            if not group_socket_manager.has_user_connections(group.id, current_profile.id):
                GroupService.clear_presence(db, current_profile, group.id)
                await group_socket_manager.broadcast_presence_removed(group.id, current_profile.id)
        db.close()
