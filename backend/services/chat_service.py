"""
Chat service — message persistence, pagination, edit/delete.
Content sanitisation is applied before any message is persisted.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from core.exceptions import (
    NotWorkspaceMember,
    MessageNotFound,
    CannotEditMessage,
    NotWorkspaceOwner,
)
from models.chat_room import ChatRoom
from models.message import Message
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember
from models.user import User

logger = structlog.get_logger()

EDIT_WINDOW_SECONDS = 600  # 10 minutes


def _sanitise(content: str) -> str:
    """
    Strip dangerous HTML from user content.
    Uses bleach when available; falls back to simple tag stripper.
    """
    try:
        import bleach
        return bleach.clean(content, tags=[], attributes={}, strip=True).strip()
    except ImportError:
        import re
        return re.sub(r"<[^>]+>", "", content).strip()


async def get_room_for_workspace(
    workspace_id: uuid.UUID,
    session: AsyncSession,
) -> ChatRoom:
    result = await session.execute(
        select(ChatRoom).where(ChatRoom.workspace_id == workspace_id)
    )
    room = result.scalar_one_or_none()
    if room is None:
        # Auto-create if somehow missing (should not happen post-workspace-creation)
        room = ChatRoom(workspace_id=workspace_id, name="general")
        session.add(room)
        await session.commit()
        await session.refresh(room)
    return room


async def _assert_approved_member(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    session: AsyncSession,
    workspace: Optional[Workspace] = None,
) -> None:
    """Raises NotWorkspaceMember if user is not an approved member or owner."""
    if workspace and workspace.owner_id == user_id:
        return

    result = await session.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
            WorkspaceMember.approved == True,  # noqa: E712
        )
    )
    if result.scalar_one_or_none() is None:
        raise NotWorkspaceMember()


async def get_messages(
    room_id: uuid.UUID,
    session: AsyncSession,
    cursor: Optional[str] = None,
    limit: int = 50,
) -> tuple[list[tuple[Message, str]], Optional[str]]:
    """
    Cursor-based pagination, newest first.
    Returns (list of (message, sender_display_name), next_cursor_iso_str | None).
    """
    limit = min(max(limit, 1), 100)

    query = (
        select(Message, User.full_name)
        .join(User, Message.sender_id == User.id)
        .where(Message.room_id == room_id)
    )

    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
            query = query.where(Message.timestamp < cursor_dt)
        except ValueError:
            pass

    query = query.order_by(Message.timestamp.desc()).limit(limit + 1)
    result = await session.execute(query)
    rows = result.all()

    has_more = len(rows) > limit
    rows = rows[:limit]

    next_cursor: Optional[str] = None
    if has_more and rows:
        oldest = rows[-1][0]
        next_cursor = oldest.timestamp.isoformat()

    return [(row[0], row[1]) for row in rows], next_cursor


async def save_message(
    room_id: uuid.UUID,
    sender_id: uuid.UUID,
    content: str,
    session: AsyncSession,
) -> tuple[Message, str]:
    """Sanitise, persist and return (message, sender_display_name)."""
    clean_content = _sanitise(content)
    if not clean_content:
        raise ValueError("Message content is empty after sanitisation")

    message = Message(
        room_id=room_id,
        sender_id=sender_id,
        content=clean_content,
    )
    session.add(message)
    await session.flush()

    # Fetch sender display name (prefer WorkspaceMember display_name, fallback to full_name)
    user_result = await session.execute(
        select(User).where(User.id == sender_id)
    )
    user = user_result.scalar_one_or_none()
    sender_name = user.full_name if user else "Unknown"

    await session.commit()
    await session.refresh(message)
    return message, sender_name


async def edit_message(
    msg_id: uuid.UUID,
    new_content: str,
    current_user: User,
    session: AsyncSession,
) -> Message:
    result = await session.execute(
        select(Message).where(Message.id == msg_id)
    )
    message = result.scalar_one_or_none()
    if not message:
        raise MessageNotFound()

    if message.sender_id != current_user.id:
        raise CannotEditMessage("You can only edit your own messages")

    cutoff = datetime.now(timezone.utc) - timedelta(seconds=EDIT_WINDOW_SECONDS)
    if message.timestamp.replace(tzinfo=timezone.utc) < cutoff:
        raise CannotEditMessage("Messages can only be edited within 10 minutes of sending")

    clean_content = _sanitise(new_content)
    if not clean_content:
        raise CannotEditMessage("Edited content cannot be empty")

    message.content = clean_content
    message.edited_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(message)
    return message


async def delete_message(
    msg_id: uuid.UUID,
    current_user: User,
    workspace: Workspace,
    session: AsyncSession,
) -> None:
    result = await session.execute(
        select(Message).where(Message.id == msg_id)
    )
    message = result.scalar_one_or_none()
    if not message:
        raise MessageNotFound()

    is_sender = message.sender_id == current_user.id
    is_owner = workspace.owner_id == current_user.id

    if not (is_sender or is_owner):
        raise CannotEditMessage("You do not have permission to delete this message")

    await session.delete(message)
    await session.commit()


async def get_messages_for_ai_context(
    room_id: uuid.UUID,
    workspace_id: uuid.UUID,
    session: AsyncSession,
    limit: int = 5,
) -> list[tuple[Message, str]]:
    """
    Returns last N messages scoped strictly to this workspace's room.
    Used by AI service — workspace_id enforced here to prevent cross-tenant leakage.
    """
    # Verify room belongs to workspace
    room_result = await session.execute(
        select(ChatRoom).where(
            ChatRoom.id == room_id,
            ChatRoom.workspace_id == workspace_id,
        )
    )
    room = room_result.scalar_one_or_none()
    if not room:
        return []

    query = (
        select(Message, User.full_name)
        .join(User, Message.sender_id == User.id)
        .where(Message.room_id == room_id)
        .order_by(Message.timestamp.desc())
        .limit(limit)
    )
    result = await session.execute(query)
    return [(row[0], row[1]) for row in result.all()]
