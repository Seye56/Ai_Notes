from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.group import Group, GroupMember, GroupNoteEvent, GroupPresence
from app.models.user import Profile
from app.schemas.group import GroupCreate, GroupEventCreate, GroupMemberAdd, GroupPresenceUpdate
from app.services.translation_service import TranslationService


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

        existing = db.scalar(
            select(GroupMember).where(
                GroupMember.group_id == group.id,
                GroupMember.user_id == payload.user_id,
            )
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User is already a member of this group.",
            )

        profile = db.get(Profile, payload.user_id)
        if profile is None:
            raise HTTPException(status_code=404, detail="User profile not found.")

        member = GroupMember(
            group_id=group.id,
            user_id=payload.user_id,
            role=payload.role,
        )
        db.add(member)
        db.commit()
        db.refresh(member)
        return member

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
