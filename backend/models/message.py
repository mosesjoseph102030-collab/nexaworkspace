import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Text, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base

if TYPE_CHECKING:
    from models.chat_room import ChatRoom
    from models.user import User


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        Index("ix_messages_room_timestamp", "room_id", "timestamp"),
        Index("ix_messages_room_is_read", "room_id", "is_read"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chat_rooms.id"), nullable=False)
    sender_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    edited_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    room: Mapped["ChatRoom"] = relationship("ChatRoom", back_populates="messages")
    sender: Mapped["User"] = relationship("User", back_populates="sent_messages")
