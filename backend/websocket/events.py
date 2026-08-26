"""
Typed WebSocket event schemas.

All events carry a `type` discriminator field.
Client→Server events describe what the client sends.
Server→Client events describe what the server broadcasts.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal, Union, Annotated

from pydantic import BaseModel, Field


# ── Client → Server ────────────────────────────────────────────────────────

class SendMessageEvent(BaseModel):
    type: Literal["message"] = "message"
    content: str


class TypingStartEvent(BaseModel):
    type: Literal["typing_start"] = "typing_start"


class TypingStopEvent(BaseModel):
    type: Literal["typing_stop"] = "typing_stop"


class PingEvent(BaseModel):
    type: Literal["ping"] = "ping"


ClientEvent = Annotated[
    Union[SendMessageEvent, TypingStartEvent, TypingStopEvent, PingEvent],
    Field(discriminator="type"),
]


# ── Server → Client ────────────────────────────────────────────────────────

class MessageBroadcastEvent(BaseModel):
    type: Literal["message"] = "message"
    id: str
    room_id: str
    sender_id: str
    sender_name: str
    content: str
    timestamp: str  # ISO 8601
    is_read: bool = False
    edited_at: str | None = None


class TypingBroadcastEvent(BaseModel):
    type: Literal["typing"] = "typing"
    user_id: str
    display_name: str
    is_typing: bool


class PresenceEvent(BaseModel):
    type: Literal["presence"] = "presence"
    user_id: str
    display_name: str
    status: Literal["online", "offline"]


class ApprovedEvent(BaseModel):
    type: Literal["approved"] = "approved"
    workspace_slug: str
    workspace_name: str


class DeclinedEvent(BaseModel):
    type: Literal["declined"] = "declined"
    workspace_slug: str


class JoinRequestEvent(BaseModel):
    type: Literal["join_request"] = "join_request"
    workspace_slug: str
    workspace_name: str
    member_id: str
    display_name: str
    user_id: str


class PongEvent(BaseModel):
    type: Literal["pong"] = "pong"


class ConnectedEvent(BaseModel):
    type: Literal["connected"] = "connected"
    workspace_id: str
    user_id: str


class ErrorEvent(BaseModel):
    type: Literal["error"] = "error"
    message: str


class MessageDeletedEvent(BaseModel):
    type: Literal["message_deleted"] = "message_deleted"
    message_id: str


class MessageEditedEvent(BaseModel):
    type: Literal["message_edited"] = "message_edited"
    message_id: str
    content: str
    edited_at: str


class AnnouncementPinnedEvent(BaseModel):
    type: Literal["announcement_pinned"] = "announcement_pinned"
    id: str
    workspace_id: str
    content: str
    emoji: str
    author_name: str
    created_at: str


class AnnouncementUnpinnedEvent(BaseModel):
    type: Literal["announcement_unpinned"] = "announcement_unpinned"
    workspace_id: str
