"""
WebSocket consumer — handles the /ws/chat and /ws/notify endpoints.

/ws/chat   — real-time workspace messaging (approved members only)
/ws/notify — personal notification channel (any authenticated user)
"""
from __future__ import annotations

import json
import uuid
from typing import Optional

import structlog
from fastapi import WebSocket, WebSocketDisconnect
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.security import decode_token
from core.exceptions import TokenExpired, InvalidToken
from db.session import async_session_factory
from models.user import User
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember
from models.chat_room import ChatRoom
from services import chat_service
from websocket.events import (
    ClientEvent,
    SendMessageEvent,
    TypingStartEvent,
    TypingStopEvent,
    PingEvent,
)
from websocket.manager import ws_manager

logger = structlog.get_logger()

# WS close codes
WS_POLICY_VIOLATION = 4003
WS_UNAUTHORIZED = 4001
WS_NORMAL_CLOSE = 1000


async def _authenticate_ws(token: Optional[str]) -> uuid.UUID:
    """Decode JWT and return user_id. Raises on failure."""
    if not token:
        raise InvalidToken()
    try:
        payload = decode_token(token)
    except (TokenExpired, InvalidToken):
        raise
    if payload.get("type") != "access":
        raise InvalidToken()
    try:
        return uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        raise InvalidToken()


async def _get_approved_context(
    user_id: uuid.UUID,
    slug: str,
    session: AsyncSession,
) -> tuple[User, Workspace, ChatRoom, str]:
    """
    Returns (user, workspace, room, display_name).
    Raises WebSocketDisconnect-friendly exceptions on failure.
    """
    user_result = await session.execute(
        select(User).where(User.id == user_id, User.is_active == True)  # noqa: E712
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise PermissionError("User not found")

    workspace_result = await session.execute(
        select(Workspace).where(Workspace.slug == slug, Workspace.is_active == True)  # noqa: E712
    )
    workspace = workspace_result.scalar_one_or_none()
    if not workspace:
        raise PermissionError("Workspace not found")

    room = await chat_service.get_room_for_workspace(workspace.id, session)

    # Owner is always allowed
    if workspace.owner_id == user.id:
        return user, workspace, room, user.full_name

    # Check approved membership
    member_result = await session.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == user.id,
            WorkspaceMember.approved == True,  # noqa: E712
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise PermissionError("Not an approved member")

    return user, workspace, room, member.display_name


async def ws_chat(
    websocket: WebSocket,
    slug: str,
    token: Optional[str] = None,
) -> None:
    """
    Main chat WebSocket handler.
    Query param: token=<JWT>  (Bearer token passed as QS param since WS can't set headers)
    """
    # ── Authenticate ───────────────────────────────────────────────────────
    try:
        user_id = await _authenticate_ws(token)
    except (InvalidToken, TokenExpired):
        await websocket.close(code=WS_UNAUTHORIZED)
        return

    # ── Verify membership ──────────────────────────────────────────────────
    async with async_session_factory() as session:
        try:
            user, workspace, room, display_name = await _get_approved_context(
                user_id, slug, session
            )
        except PermissionError as e:
            await websocket.close(code=WS_POLICY_VIOLATION)
            return

    workspace_id = workspace.id

    # ── Accept and register ────────────────────────────────────────────────
    await websocket.accept()

    # Snapshot the currently-online user_ids BEFORE registering self,
    # so we can look up their display names from the DB.
    online_user_ids = ws_manager.get_online_users(workspace_id)

    await ws_manager.connect(websocket, workspace_id, user_id, display_name)

    # Send connected confirmation
    await websocket.send_text(json.dumps({
        "type": "connected",
        "workspace_id": str(workspace_id),
        "user_id": str(user_id),
    }))

    # ── Presence snapshot ─────────────────────────────────────────────────
    # Build the roster of already-online members so the new client knows
    # who is online without waiting for them to send their next event.
    if online_user_ids:
        async with async_session_factory() as snap_session:
            snapshot_users: list[dict] = []
            for uid_str in online_user_ids:
                try:
                    uid = uuid.UUID(uid_str)
                except ValueError:
                    continue
                # Owner: display name comes from user.full_name
                if uid == workspace.owner_id:
                    u_res = await snap_session.execute(
                        select(User).where(User.id == uid)
                    )
                    u = u_res.scalar_one_or_none()
                    snap_name = u.full_name if u else uid_str
                else:
                    m_res = await snap_session.execute(
                        select(WorkspaceMember).where(
                            WorkspaceMember.workspace_id == workspace_id,
                            WorkspaceMember.user_id == uid,
                        )
                    )
                    m = m_res.scalar_one_or_none()
                    snap_name = m.display_name if m else uid_str
                snapshot_users.append({
                    "user_id": uid_str,
                    "display_name": snap_name,
                    "status": "online",
                })

            if snapshot_users:
                await websocket.send_text(json.dumps({
                    "type": "presence_snapshot",
                    "users": snapshot_users,
                }))

    logger.info("WS chat accepted", slug=slug, user_id=str(user_id))

    # ── Message loop ───────────────────────────────────────────────────────
    try:
        while True:
            raw = await websocket.receive_text()

            # Re-verify membership on each event (security: membership could be revoked)
            async with async_session_factory() as session:
                try:
                    user, workspace, room, display_name = await _get_approved_context(
                        user_id, slug, session
                    )
                except PermissionError:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Your access to this workspace has been revoked",
                    }))
                    await websocket.close(code=WS_POLICY_VIOLATION)
                    return

                # ── Parse event ────────────────────────────────────────────
                try:
                    data = json.loads(raw)
                    event_type = data.get("type")
                except (json.JSONDecodeError, AttributeError):
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Invalid JSON",
                    }))
                    continue

                # ── Dispatch ───────────────────────────────────────────────
                if event_type == "message":
                    content = data.get("content", "").strip()
                    if not content:
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "Message content cannot be empty",
                        }))
                        continue

                    try:
                        message, sender_name = await chat_service.save_message(
                            room_id=room.id,
                            sender_id=user_id,
                            content=content,
                            session=session,
                        )
                    except ValueError as e:
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": str(e),
                        }))
                        continue

                    broadcast_event = {
                        "type": "message",
                        "id": str(message.id),
                        "room_id": str(message.room_id),
                        "sender_id": str(message.sender_id),
                        "sender_name": sender_name,
                        "content": message.content,
                        "timestamp": message.timestamp.isoformat(),
                        "is_read": message.is_read,
                        "edited_at": None,
                    }
                    await ws_manager.broadcast_to_workspace(workspace_id, broadcast_event)

                elif event_type == "typing_start":
                    await ws_manager.broadcast_to_workspace(
                        workspace_id,
                        {
                            "type": "typing",
                            "user_id": str(user_id),
                            "display_name": display_name,
                            "is_typing": True,
                        },
                    )

                elif event_type == "typing_stop":
                    await ws_manager.broadcast_to_workspace(
                        workspace_id,
                        {
                            "type": "typing",
                            "user_id": str(user_id),
                            "display_name": display_name,
                            "is_typing": False,
                        },
                    )

                elif event_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))

                else:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": f"Unknown event type: {event_type}",
                    }))

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error("WS chat error", error=str(e), user_id=str(user_id))
    finally:
        await ws_manager.disconnect(websocket, workspace_id, user_id, display_name)


async def ws_notify(
    websocket: WebSocket,
    token: Optional[str] = None,
) -> None:
    """
    Personal notification WebSocket.
    Delivers approval/decline/join-request events to the connected user.
    """
    try:
        user_id = await _authenticate_ws(token)
    except (InvalidToken, TokenExpired):
        await websocket.close(code=WS_UNAUTHORIZED)
        return

    await websocket.accept()
    await ws_manager.connect_personal(websocket, user_id)
    logger.info("WS notify accepted", user_id=str(user_id))

    try:
        while True:
            # Keep-alive: accept pings from client
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                if data.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except (json.JSONDecodeError, AttributeError):
                pass
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error("WS notify error", error=str(e), user_id=str(user_id))
    finally:
        await ws_manager.disconnect_personal(websocket, user_id)
