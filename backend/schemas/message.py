import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class MessageCreate(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message content cannot be empty")
        if len(v) > 10000:
            raise ValueError("Message content must be 10,000 characters or fewer")
        return v


class MessageEdit(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message content cannot be empty")
        return v


class MessageResponse(BaseModel):
    id: uuid.UUID
    room_id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str
    content: str
    timestamp: datetime
    is_read: bool
    edited_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class MessagePage(BaseModel):
    messages: list[MessageResponse]
    next_cursor: Optional[str] = None  # ISO timestamp of oldest message in page
    has_more: bool
