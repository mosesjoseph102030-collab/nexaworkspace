import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.dependencies import get_current_user
from core.exceptions import NotWorkspaceMember
from db.session import get_db
from models.user import User
from models.workspace_member import WorkspaceMember
from models.chat_room import ChatRoom
from schemas.message import MessageResponse, MessageCreate, MessageEdit, MessagePage
from services import chat_service, workspace_service

router = APIRouter()


async def _get_approved_member_room(
    slug: str,
    current_user: User,
    db: AsyncSession,
) -> tuple:
    """Helper: return (workspace, room) ensuring current_user is approved."""
    workspace = await workspace_service.get_workspace_by_slug(slug, db)

    if workspace.owner_id != current_user.id:
        result = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace.id,
                WorkspaceMember.user_id == current_user.id,
                WorkspaceMember.approved == True,  # noqa: E712
            )
        )
        if result.scalar_one_or_none() is None:
            raise NotWorkspaceMember()

    room = await chat_service.get_room_for_workspace(workspace.id, db)
    return workspace, room


@router.get("/{slug}/messages", response_model=MessagePage)
async def list_messages(
    slug: str,
    cursor: Optional[str] = Query(default=None, description="ISO timestamp cursor for pagination"),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessagePage:
    workspace, room = await _get_approved_member_room(slug, current_user, db)
    rows, next_cursor = await chat_service.get_messages(
        room_id=room.id,
        session=db,
        cursor=cursor,
        limit=limit,
    )
    messages = [
        MessageResponse(
            id=msg.id,
            room_id=msg.room_id,
            sender_id=msg.sender_id,
            sender_name=sender_name,
            content=msg.content,
            timestamp=msg.timestamp,
            is_read=msg.is_read,
            edited_at=msg.edited_at,
        )
        for msg, sender_name in rows
    ]
    return MessagePage(
        messages=messages,
        next_cursor=next_cursor,
        has_more=next_cursor is not None,
    )


@router.post("/{slug}/messages", response_model=MessageResponse, status_code=201)
async def send_message(
    slug: str,
    body: MessageCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """REST fallback for sending messages (primary path is WebSocket)."""
    workspace, room = await _get_approved_member_room(slug, current_user, db)
    message, sender_name = await chat_service.save_message(
        room_id=room.id,
        sender_id=current_user.id,
        content=body.content,
        session=db,
    )
    # Broadcast via WS manager
    try:
        from websocket.manager import ws_manager
        await ws_manager.broadcast_to_workspace(
            workspace_id=workspace.id,
            event={
                "type": "message",
                "id": str(message.id),
                "room_id": str(message.room_id),
                "sender_id": str(message.sender_id),
                "sender_name": sender_name,
                "content": message.content,
                "timestamp": message.timestamp.isoformat(),
                "is_read": message.is_read,
                "edited_at": message.edited_at.isoformat() if message.edited_at else None,
            },
        )
    except Exception:
        pass  # WS broadcast failure doesn't fail the REST response

    return MessageResponse(
        id=message.id,
        room_id=message.room_id,
        sender_id=message.sender_id,
        sender_name=sender_name,
        content=message.content,
        timestamp=message.timestamp,
        is_read=message.is_read,
        edited_at=message.edited_at,
    )


@router.patch("/{slug}/messages/{message_id}", response_model=MessageResponse)
async def edit_message(
    slug: str,
    message_id: uuid.UUID,
    body: MessageEdit,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    workspace, room = await _get_approved_member_room(slug, current_user, db)
    message = await chat_service.edit_message(
        msg_id=message_id,
        new_content=body.content,
        current_user=current_user,
        session=db,
    )
    # Broadcast edit event
    try:
        from websocket.manager import ws_manager
        await ws_manager.broadcast_to_workspace(
            workspace_id=workspace.id,
            event={
                "type": "message_edited",
                "message_id": str(message.id),
                "content": message.content,
                "edited_at": message.edited_at.isoformat() if message.edited_at else None,
            },
        )
    except Exception:
        pass

    return MessageResponse(
        id=message.id,
        room_id=message.room_id,
        sender_id=message.sender_id,
        sender_name=current_user.full_name,
        content=message.content,
        timestamp=message.timestamp,
        is_read=message.is_read,
        edited_at=message.edited_at,
    )


@router.delete("/{slug}/messages/{message_id}", status_code=204)
async def delete_message(
    slug: str,
    message_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    workspace, room = await _get_approved_member_room(slug, current_user, db)
    await chat_service.delete_message(
        msg_id=message_id,
        current_user=current_user,
        workspace=workspace,
        session=db,
    )
    # Broadcast delete event
    try:
        from websocket.manager import ws_manager
        await ws_manager.broadcast_to_workspace(
            workspace_id=workspace.id,
            event={"type": "message_deleted", "message_id": str(message_id)},
        )
    except Exception:
        pass
