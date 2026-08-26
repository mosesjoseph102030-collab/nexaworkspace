"""
Announcements — owner-only pin/unpin.
GET  /api/workspaces/{slug}/announcement       — get current pinned announcement (public to members)
POST /api/workspaces/{slug}/announcement       — create + pin (owner only)
DELETE /api/workspaces/{slug}/announcement     — unpin (owner only)
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, field_validator

from core.dependencies import get_current_user
from core.exceptions import NotWorkspaceOwner, NotWorkspaceMember
from db.session import get_db
from models.user import User
from models.announcement import Announcement
from models.workspace_member import WorkspaceMember
from services.workspace_service import get_workspace_by_slug

router = APIRouter()


class AnnouncementCreate(BaseModel):
    content: str
    emoji: str = "📌"

    @field_validator("content")
    @classmethod
    def not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Announcement content cannot be empty")
        if len(v) > 500:
            raise ValueError("Announcement must be 500 characters or fewer")
        return v


class AnnouncementResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    content: str
    emoji: str
    author_name: str
    pinned: bool
    created_at: str

    model_config = {"from_attributes": True}


async def _require_member(slug: str, current_user: User, db: AsyncSession):
    workspace = await get_workspace_by_slug(slug, db)
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
    return workspace


@router.get("/{slug}/announcement", response_model=Optional[AnnouncementResponse])
async def get_announcement(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Optional[AnnouncementResponse]:
    workspace = await _require_member(slug, current_user, db)

    result = await db.execute(
        select(Announcement).where(
            Announcement.workspace_id == workspace.id,
            Announcement.pinned == True,  # noqa: E712
        )
    )
    ann = result.scalar_one_or_none()
    if not ann:
        return None

    author_result = await db.execute(
        select(User).where(User.id == ann.author_id)
    )
    author = author_result.scalar_one_or_none()

    return AnnouncementResponse(
        id=ann.id,
        workspace_id=ann.workspace_id,
        content=ann.content,
        emoji=ann.emoji or "📌",
        author_name=author.full_name if author else "Owner",
        pinned=ann.pinned,
        created_at=ann.created_at.isoformat(),
    )


@router.post("/{slug}/announcement", response_model=AnnouncementResponse, status_code=201)
async def pin_announcement(
    slug: str,
    body: AnnouncementCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AnnouncementResponse:
    workspace = await get_workspace_by_slug(slug, db)
    if workspace.owner_id != current_user.id:
        raise NotWorkspaceOwner()

    # Unpin any existing announcement first
    existing_result = await db.execute(
        select(Announcement).where(
            Announcement.workspace_id == workspace.id,
            Announcement.pinned == True,  # noqa: E712
        )
    )
    for existing in existing_result.scalars().all():
        existing.pinned = False

    ann = Announcement(
        workspace_id=workspace.id,
        author_id=current_user.id,
        content=body.content.strip(),
        emoji=body.emoji or "📌",
        pinned=True,
    )
    db.add(ann)
    await db.commit()
    await db.refresh(ann)

    # Broadcast to all workspace members via WebSocket
    redis = getattr(request.app.state, "redis", None)
    event = {
        "type": "announcement_pinned",
        "id": str(ann.id),
        "workspace_id": str(workspace.id),
        "content": ann.content,
        "emoji": ann.emoji or "📌",
        "author_name": current_user.full_name,
        "created_at": ann.created_at.isoformat(),
    }
    try:
        from websocket.manager import ws_manager
        await ws_manager.broadcast_to_workspace(workspace.id, event)
    except Exception:
        pass

    return AnnouncementResponse(
        id=ann.id,
        workspace_id=ann.workspace_id,
        content=ann.content,
        emoji=ann.emoji or "📌",
        author_name=current_user.full_name,
        pinned=ann.pinned,
        created_at=ann.created_at.isoformat(),
    )


@router.delete("/{slug}/announcement", status_code=204)
async def unpin_announcement(
    slug: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    workspace = await get_workspace_by_slug(slug, db)
    if workspace.owner_id != current_user.id:
        raise NotWorkspaceOwner()

    result = await db.execute(
        select(Announcement).where(
            Announcement.workspace_id == workspace.id,
            Announcement.pinned == True,  # noqa: E712
        )
    )
    for ann in result.scalars().all():
        ann.pinned = False
    await db.commit()

    # Broadcast unpin event
    event = {
        "type": "announcement_unpinned",
        "workspace_id": str(workspace.id),
    }
    try:
        from websocket.manager import ws_manager
        await ws_manager.broadcast_to_workspace(workspace.id, event)
    except Exception:
        pass
