import uuid
from typing import Optional

from pydantic import BaseModel, field_validator


class SmartReplyRequest(BaseModel):
    last_message_id: uuid.UUID


class SmartReplyResponse(BaseModel):
    suggestions: list[str]


class SummaryRequest(BaseModel):
    last_n_messages: int = 50

    @field_validator("last_n_messages")
    @classmethod
    def valid_range(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Must request at least 1 message")
        if v > 100:
            raise ValueError("Cannot summarise more than 100 messages at once")
        return v


class SummaryResponse(BaseModel):
    summary: str
    message_count: int
    from_ts: Optional[str] = None
    to_ts: Optional[str] = None
