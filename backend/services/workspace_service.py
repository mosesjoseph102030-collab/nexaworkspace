import re
import uuid
from typing import Optional

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.exceptions import (
    WorkspaceNotFound,
    ReservedSlug,
    DuplicateMembership,
    NotWorkspaceOwner,
)
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember
from models.chat_room import ChatRoom
from models.user import User

logger = structlog.get_logger()

RESERVED_SLUGS = frozenset({
    "api", "admin", "system-monitor", "www", "app", "auth",
    "static", "media", "health", "ws", "socket", "login",
    "register", "logout", "dashboard",
})


def generate_slug(name: str) -> str:
    """Convert a business name to a URL-safe slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")
    slug = slug[:50]
    slug = slug.strip("-")
    return slug or "workspace"


async def ensure_unique_slug(session: AsyncSession, base_slug: str) -> str:
    """Appends -2, -3 etc. until slug is unique. Raises on reserved slugs."""
    if base_slug in RESERVED_SLUGS:
        raise ReservedSlug()

    candidate = base_slug
    counter = 2
    while True:
        result = await session.execute(
            select(Workspace).where(Workspace.slug == candidate)
        )
        if result.scalar_one_or_none() is None:
            return candidate
        candidate = f"{base_slug}-{counter}"
        counter += 1
        if counter > 999:
            raise ValueError("Could not generate a unique slug")


async def create_workspace(
    owner: User,
    name: str,
    session: AsyncSession,
) -> Workspace:
    base_slug = generate_slug(name)
    slug = await ensure_unique_slug(session, base_slug)

    workspace = Workspace(
        name=name.strip(),
        slug=slug,
        owner_id=owner.id,
    )
    session.add(workspace)
    await session.flush()  # get workspace.id before creating room

    # Auto-create the general chat room
    room = ChatRoom(workspace_id=workspace.id, name="general")
    session.add(room)

    await session.commit()
    await session.refresh(workspace)
    logger.info("Workspace created", slug=slug, owner_id=str(owner.id))
    return workspace


async def get_workspace_by_slug(
    slug: str,
    session: AsyncSession,
    require_active: bool = True,
) -> Workspace:
    filters = [Workspace.slug == slug]
    if require_active:
        filters.append(Workspace.is_active == True)  # noqa: E712
    result = await session.execute(select(Workspace).where(*filters))
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise WorkspaceNotFound()
    return workspace


async def update_workspace(
    slug: str,
    name: Optional[str],
    current_user: User,
    session: AsyncSession,
) -> Workspace:
    workspace = await get_workspace_by_slug(slug, session)
    if workspace.owner_id != current_user.id:
        raise NotWorkspaceOwner()
    if name is not None:
        workspace.name = name.strip()
    await session.commit()
    await session.refresh(workspace)
    return workspace


async def delete_workspace(
    slug: str,
    current_user: User,
    session: AsyncSession,
) -> None:
    workspace = await get_workspace_by_slug(slug, session)
    if workspace.owner_id != current_user.id:
        raise NotWorkspaceOwner()
    workspace.is_active = False
    await session.commit()


# ── Membership ────────────────────────────────────────────────────────────

async def request_membership(
    slug: str,
    user: User,
    display_name: str,
    session: AsyncSession,
    redis=None,
) -> WorkspaceMember:
    workspace = await get_workspace_by_slug(slug, session)

    # Owner can't request to join their own workspace
    if workspace.owner_id == user.id:
        raise DuplicateMembership()

    # Check for existing membership
    existing = await session.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise DuplicateMembership()

    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=user.id,
        display_name=display_name.strip(),
        approved=False,
    )
    session.add(member)
    await session.commit()
    await session.refresh(member)

    # Notify owner via personal channel
    if redis is not None:
        import json
        event = {
            "type": "join_request",
            "workspace_slug": slug,
            "workspace_name": workspace.name,
            "member_id": str(member.id),
            "display_name": display_name,
            "user_id": str(user.id),
        }
        await redis.publish(f"user:{workspace.owner_id}", json.dumps(event))

    logger.info("Membership requested", slug=slug, user_id=str(user.id))
    return member


async def list_members(
    slug: str,
    current_user: User,
    session: AsyncSession,
) -> list[WorkspaceMember]:
    workspace = await get_workspace_by_slug(slug, session)
    if workspace.owner_id != current_user.id:
        raise NotWorkspaceOwner()
    result = await session.execute(
        select(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace.id)
    )
    return list(result.scalars().all())


async def list_pending(
    slug: str,
    current_user: User,
    session: AsyncSession,
) -> list[WorkspaceMember]:
    workspace = await get_workspace_by_slug(slug, session)
    if workspace.owner_id != current_user.id:
        raise NotWorkspaceOwner()
    result = await session.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.approved == False,  # noqa: E712
        )
    )
    return list(result.scalars().all())


async def approve_member(
    slug: str,
    member_id: uuid.UUID,
    current_user: User,
    session: AsyncSession,
    redis=None,
) -> WorkspaceMember:
    workspace = await get_workspace_by_slug(slug, session)
    if workspace.owner_id != current_user.id:
        raise NotWorkspaceOwner()

    result = await session.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.id == member_id,
            WorkspaceMember.workspace_id == workspace.id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        from core.exceptions import NotWorkspaceMember
        raise NotWorkspaceMember()

    member.approved = True
    await session.commit()
    await session.refresh(member)

    # Notify the approved user
    if redis is not None:
        import json
        event = {
            "type": "approved",
            "workspace_slug": slug,
            "workspace_name": workspace.name,
        }
        await redis.publish(f"user:{member.user_id}", json.dumps(event))

    logger.info("Member approved", slug=slug, member_id=str(member_id))
    return member


async def decline_member(
    slug: str,
    member_id: uuid.UUID,
    current_user: User,
    session: AsyncSession,
    redis=None,
) -> None:
    workspace = await get_workspace_by_slug(slug, session)
    if workspace.owner_id != current_user.id:
        raise NotWorkspaceOwner()

    result = await session.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.id == member_id,
            WorkspaceMember.workspace_id == workspace.id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        from core.exceptions import NotWorkspaceMember
        raise NotWorkspaceMember()

    user_id = member.user_id

    # Notify before deleting
    if redis is not None:
        import json
        event = {
            "type": "declined",
            "workspace_slug": slug,
        }
        await redis.publish(f"user:{user_id}", json.dumps(event))

    await session.delete(member)
    await session.commit()
    logger.info("Member declined", slug=slug, member_id=str(member_id))


async def remove_member(
    slug: str,
    member_id: uuid.UUID,
    current_user: User,
    session: AsyncSession,
    ws_manager=None,
) -> None:
    workspace = await get_workspace_by_slug(slug, session)
    if workspace.owner_id != current_user.id:
        raise NotWorkspaceOwner()

    result = await session.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.id == member_id,
            WorkspaceMember.workspace_id == workspace.id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        from core.exceptions import NotWorkspaceMember
        raise NotWorkspaceMember()

    user_id = member.user_id
    await session.delete(member)
    await session.commit()

    # Force-close any active WS connections for this user in the workspace
    if ws_manager is not None:
        await ws_manager.kick_user(workspace_id=workspace.id, user_id=user_id)

    logger.info("Member removed", slug=slug, member_id=str(member_id))


async def get_membership_status(
    slug: str,
    current_user: User,
    session: AsyncSession,
) -> str:
    workspace = await get_workspace_by_slug(slug, session)

    if workspace.owner_id == current_user.id:
        return "owner"

    result = await session.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == current_user.id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        return "none"
    return "approved" if member.approved else "pending"
