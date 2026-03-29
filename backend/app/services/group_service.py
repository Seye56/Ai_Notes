from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, WebSocket, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.group import Group, GroupMember, GroupNoteEvent, GroupPresence
from app.models.user import Profile
from app.schemas.group import GroupCreate, GroupEventCreate, GroupMemberAdd, GroupPresenceUpdate, GroupSocketEventCreate
from app.services.translation_service import TranslationService


@dataclass
class GroupSocketConnection:
    user_id: UUID
    language: str
    websocket: WebSocket


class GroupSocketManager:
    def __init__(self) -> None:
        self._connections: dict[UUID, dict[UUID, list[GroupSocketConnection]]] = defaultdict(
            lambda: defaultdict(list)
        )

    async def connect(
        self,
        group_id: UUID,
        profile: Profile,
        websocket: WebSocket,
        language: str,
    ) -> None:
        await websocket.accept()
        self._connections[group_id][profile.id].append(
            GroupSocketConnection(
                user_id=profile.id,
                language=language,
                websocket=websocket,
            )
        )

    def disconnect(self, group_id: UUID, user_id: UUID, websocket: WebSocket) -> None:
        group_connections = self._connections.get(group_id)
        if not group_connections:
            return

        user_connections = group_connections.get(user_id, [])
        group_connections[user_id] = [
            connection
            for connection in user_connections
            if connection.websocket is not websocket
        ]
        if not group_connections[user_id]:
            group_connections.pop(user_id, None)
        if not group_connections:
            self._connections.pop(group_id, None)

    def has_user_connections(self, group_id: UUID, user_id: UUID) -> bool:
        group_connections = self._connections.get(group_id, {})
        return bool(group_connections.get(user_id))

    async def send_presence_snapshot(
        self,
        websocket: WebSocket,
        presences: list[GroupPresence],
    ) -> None:
        await websocket.send_json(
            {
                "type": "presence_snapshot",
                "presences": [GroupService.serialize_presence(presence) for presence in presences],
            }
        )

    async def broadcast_group_event(
        self,
        db: Session,
        group: Group,
        event: GroupNoteEvent,
    ) -> None:
        group_connections = self._connections.get(group.id, {})
        if not group_connections:
            return

        translations_by_language: dict[str, str] = {}
        stale_connections: list[tuple[UUID, WebSocket]] = []

        for user_id, connections in group_connections.items():
            for connection in connections:
                delivered_text, delivered_language = GroupService.translate_live_event_for_language(
                    event=event,
                    target_language=connection.language,
                    translation_cache=translations_by_language,
                )
                payload = {
                    "type": "group_note_event",
                    "event_id": str(event.id),
                    "group_id": str(event.group_id),
                    "sender_id": str(event.sender_id),
                    "recipient_user_id": str(user_id),
                    "original_text": event.original_text,
                    "original_language": event.original_language,
                    "translated_text": delivered_text,
                    "translated_language": delivered_language,
                    "event_type": event.event_type,
                    "created_at": event.created_at.isoformat(),
                }
                try:
                    await connection.websocket.send_json(payload)
                except Exception:
                    stale_connections.append((user_id, connection.websocket))

        for user_id, websocket in stale_connections:
            self.disconnect(group.id, user_id, websocket)

    async def broadcast_presence_update(self, group_id: UUID, presence: GroupPresence) -> None:
        group_connections = self._connections.get(group_id, {})
        if not group_connections:
            return

        payload = {
            "type": "presence_update",
            "presence": GroupService.serialize_presence(presence),
        }
        stale_connections: list[tuple[UUID, WebSocket]] = []
        for user_id, connections in group_connections.items():
            for connection in connections:
                try:
                    await connection.websocket.send_json(payload)
                except Exception:
                    stale_connections.append((user_id, connection.websocket))

        for user_id, websocket in stale_connections:
            self.disconnect(group_id, user_id, websocket)

    async def broadcast_presence_removed(self, group_id: UUID, user_id: UUID) -> None:
        group_connections = self._connections.get(group_id, {})
        if not group_connections:
            return

        payload = {
            "type": "presence_removed",
            "group_id": str(group_id),
            "user_id": str(user_id),
        }
        stale_connections: list[tuple[UUID, WebSocket]] = []
        for member_id, connections in group_connections.items():
            for connection in connections:
                try:
                    await connection.websocket.send_json(payload)
                except Exception:
                    stale_connections.append((member_id, connection.websocket))

        for member_id, websocket in stale_connections:
            self.disconnect(group_id, member_id, websocket)


group_socket_manager = GroupSocketManager()


class GroupService:
    @staticmethod
    def create_group(db: Session, owner: Profile, payload: GroupCreate) -> Group:
        group = Group(
            name=payload.name.strip(),
            owner_id=owner.id,
            default_language=payload.default_language,
        )
        db.add(group)
        db.flush()

        owner_membership = GroupMember(
            group_id=group.id,
            user_id=owner.id,
            role="owner",
        )
        db.add(owner_membership)
        db.commit()
        db.refresh(group)
        return group

    @staticmethod
    def list_groups(db: Session, owner: Profile) -> list[Group]:
        stmt = (
            select(Group)
            .outerjoin(GroupMember, GroupMember.group_id == Group.id)
            .where(
                or_(
                    Group.owner_id == owner.id,
                    GroupMember.user_id == owner.id,
                )
            )
            .distinct()
            .order_by(Group.created_at.desc())
        )
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_group_or_404(db: Session, owner: Profile, group_id: UUID | str) -> Group:
        parsed_group_id = GroupService._parse_uuid(group_id)
        group = db.get(Group, parsed_group_id)
        if group is None:
            raise HTTPException(status_code=404, detail="Group not found.")

        if group.owner_id == owner.id:
            return group

        membership = db.scalar(
            select(GroupMember).where(
                GroupMember.group_id == group.id,
                GroupMember.user_id == owner.id,
            )
        )
        if membership is None:
            raise HTTPException(status_code=404, detail="Group not found.")
        return group

    @staticmethod
    def list_members(db: Session, owner: Profile, group_id: UUID | str) -> list[GroupMember]:
        group = GroupService.get_group_or_404(db, owner, group_id)
        stmt = (
            select(GroupMember)
            .where(GroupMember.group_id == group.id)
            .order_by(GroupMember.joined_at.asc())
        )
        return list(db.scalars(stmt).all())

    @staticmethod
    def add_member(
        db: Session,
        owner: Profile,
        group_id: UUID | str,
        payload: GroupMemberAdd,
    ) -> GroupMember:
        group = GroupService.get_group_or_404(db, owner, group_id)
        GroupService._require_group_manager(db, owner, group)
        profile = GroupService._resolve_member_profile(db, payload)

        existing = db.scalar(
            select(GroupMember).where(
                GroupMember.group_id == group.id,
                GroupMember.user_id == profile.id,
            )
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User is already a member of this group.",
            )

        member = GroupMember(
            group_id=group.id,
            user_id=profile.id,
            role=payload.role,
        )
        db.add(member)
        db.commit()
        db.refresh(member)
        return member

    @staticmethod
    def _resolve_member_profile(db: Session, payload: GroupMemberAdd) -> Profile:
        if payload.user_id is not None:
            profile = db.get(Profile, payload.user_id)
        else:
            profile = db.scalar(
                select(Profile).where(Profile.email.ilike((payload.email or "").strip()))
            )

        if profile is None:
            raise HTTPException(status_code=404, detail="User profile not found.")

        return profile

    @staticmethod
    def remove_member(
        db: Session,
        owner: Profile,
        group_id: UUID | str,
        user_id: UUID | str,
    ) -> None:
        group = GroupService.get_group_or_404(db, owner, group_id)
        GroupService._require_group_manager(db, owner, group)

        parsed_user_id = GroupService._parse_uuid(user_id)
        member = db.scalar(
            select(GroupMember).where(
                GroupMember.group_id == group.id,
                GroupMember.user_id == parsed_user_id,
            )
        )
        if member is None:
            raise HTTPException(status_code=404, detail="Group member not found.")
        if member.user_id == group.owner_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The group owner cannot be removed from the session.",
            )

        db.delete(member)
        db.commit()

    @staticmethod
    def create_event(
        db: Session,
        owner: Profile,
        group_id: UUID | str,
        payload: GroupEventCreate,
    ) -> GroupNoteEvent:
        group = GroupService.get_group_or_404(db, owner, group_id)
        translated_text: str | None = None
        translated_language = payload.translated_language

        if translated_language:
            translated_text = TranslationService._translate_text(
                text=payload.original_text,
                source_language=payload.original_language,
                target_language=translated_language,
            )

        event = GroupNoteEvent(
            group_id=group.id,
            sender_id=owner.id,
            original_text=payload.original_text,
            original_language=payload.original_language,
            translated_text=translated_text,
            translated_language=translated_language,
            event_type=payload.event_type,
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def create_socket_event(
        db: Session,
        owner: Profile,
        group_id: UUID | str,
        payload: GroupSocketEventCreate,
    ) -> tuple[Group, GroupNoteEvent]:
        group = GroupService.get_group_or_404(db, owner, group_id)
        event = GroupNoteEvent(
            group_id=group.id,
            sender_id=owner.id,
            original_text=payload.original_text,
            original_language=payload.original_language,
            translated_text=None,
            translated_language=None,
            event_type=payload.event_type,
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return group, event

    @staticmethod
    def list_events(
        db: Session,
        owner: Profile,
        group_id: UUID | str,
    ) -> list[GroupNoteEvent]:
        group = GroupService.get_group_or_404(db, owner, group_id)
        stmt = (
            select(GroupNoteEvent)
            .where(GroupNoteEvent.group_id == group.id)
            .order_by(GroupNoteEvent.created_at.asc())
        )
        return list(db.scalars(stmt).all())

    @staticmethod
    def upsert_presence(
        db: Session,
        owner: Profile,
        group_id: UUID | str,
        payload: GroupPresenceUpdate,
    ) -> GroupPresence:
        group = GroupService.get_group_or_404(db, owner, group_id)
        presence = db.scalar(
            select(GroupPresence).where(
                GroupPresence.group_id == group.id,
                GroupPresence.user_id == owner.id,
            )
        )

        if presence is None:
            presence = GroupPresence(
                group_id=group.id,
                user_id=owner.id,
            )
            db.add(presence)

        presence.cursor_position = payload.cursor_position
        presence.selection_start = payload.selection_start
        presence.selection_end = payload.selection_end
        presence.is_typing = payload.is_typing
        presence.last_seen = datetime.now(timezone.utc)
        presence.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(presence)
        return presence

    @staticmethod
    def list_presences(
        db: Session,
        owner: Profile,
        group_id: UUID | str,
    ) -> list[GroupPresence]:
        group = GroupService.get_group_or_404(db, owner, group_id)
        stmt = (
            select(GroupPresence)
            .where(GroupPresence.group_id == group.id)
            .order_by(GroupPresence.updated_at.desc())
        )
        return list(db.scalars(stmt).all())

    @staticmethod
    def clear_presence(
        db: Session,
        owner: Profile,
        group_id: UUID | str,
    ) -> None:
        group = GroupService.get_group_or_404(db, owner, group_id)
        presence = db.scalar(
            select(GroupPresence).where(
                GroupPresence.group_id == group.id,
                GroupPresence.user_id == owner.id,
            )
        )
        if presence is None:
            return

        db.delete(presence)
        db.commit()

    @staticmethod
    def resolve_socket_language(
        db: Session,
        group: Group,
        owner: Profile,
        requested_language: str | None,
    ) -> str:
        return requested_language or owner.preferred_language or group.default_language

    @staticmethod
    def translate_live_event_for_language(
        *,
        event: GroupNoteEvent,
        target_language: str,
        translation_cache: dict[str, str],
    ) -> tuple[str, str]:
        if target_language.lower() == event.original_language.lower():
            return event.original_text, event.original_language

        cached = translation_cache.get(target_language)
        if cached is None:
            cached = TranslationService._translate_text(
                text=event.original_text,
                source_language=event.original_language,
                target_language=target_language,
            )
            translation_cache[target_language] = cached
        return cached, target_language

    @staticmethod
    def serialize_presence(presence: GroupPresence) -> dict[str, object]:
        return {
            "id": str(presence.id),
            "group_id": str(presence.group_id),
            "user_id": str(presence.user_id),
            "cursor_position": presence.cursor_position,
            "selection_start": presence.selection_start,
            "selection_end": presence.selection_end,
            "is_typing": presence.is_typing,
            "last_seen": presence.last_seen.isoformat(),
            "updated_at": presence.updated_at.isoformat(),
        }

    @staticmethod
    def _require_group_manager(db: Session, owner: Profile, group: Group) -> None:
        if group.owner_id == owner.id:
            return

        membership = db.scalar(
            select(GroupMember).where(
                GroupMember.group_id == group.id,
                GroupMember.user_id == owner.id,
            )
        )
        if membership is None or membership.role not in {"owner", "admin"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to manage this group.",
            )

    @staticmethod
    def _parse_uuid(value: UUID | str) -> UUID:
        if isinstance(value, UUID):
            return value
        return UUID(value)
