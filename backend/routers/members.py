import uuid

from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import get_current_user
from db.session import get_db
from models.user import User
from schemas.workspace import (
    MembershipRequest,
    MemberResponse,
    MemberStatusResponse,
)
from services import workspace_service

router = APIRouter()


@router.post("/{slug}/members/request", response_model=MemberResponse, status_code=201)
async def request_membership(
    slug: str,
    body: MembershipRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MemberResponse:
    # Redis injected from app state when available
    redis = getattr(request.app.state, "redis", None)
    member = await workspace_service.request_membership(
        slug=slug,
        user=current_user,
        display_name=body.display_name,
        session=db,
        redis=redis,
    )
    return MemberResponse.model_validate(member)


@router.get("/{slug}/members", response_model=list[MemberResponse])
async def list_members(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MemberResponse]:
    """Owner gets all members. Approved members get only approved members."""
    from sqlalchemy import select
    from models.workspace_member import WorkspaceMember
    from services.workspace_service import get_workspace_by_slug

    workspace = await get_workspace_by_slug(slug, db)

    # Owner sees everyone (pending + approved)
    if workspace.owner_id == current_user.id:
        members = await workspace_service.list_members(slug, current_user, db)
        return [MemberResponse.model_validate(m) for m in members]

    # Approved members see only approved members
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.approved == True,  # noqa: E712
        )
    )
    return [MemberResponse.model_validate(m) for m in result.scalars().all()]


@router.get("/{slug}/members/pending", response_model=list[MemberResponse])
async def list_pending(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MemberResponse]:
    members = await workspace_service.list_pending(slug, current_user, db)
    return [MemberResponse.model_validate(m) for m in members]


@router.get("/{slug}/members/me", response_model=MemberStatusResponse)
async def membership_status(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MemberStatusResponse:
    status_str = await workspace_service.get_membership_status(slug, current_user, db)
    return MemberStatusResponse(status=status_str)


@router.post("/{slug}/members/{member_id}/approve", response_model=MemberResponse)
async def approve_member(
    slug: str,
    member_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MemberResponse:
    redis = getattr(request.app.state, "redis", None)
    member = await workspace_service.approve_member(
        slug=slug,
        member_id=member_id,
        current_user=current_user,
        session=db,
        redis=redis,
    )
    return MemberResponse.model_validate(member)


@router.post("/{slug}/members/{member_id}/decline", status_code=204)
async def decline_member(
    slug: str,
    member_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    redis = getattr(request.app.state, "redis", None)
    await workspace_service.decline_member(
        slug=slug,
        member_id=member_id,
        current_user=current_user,
        session=db,
        redis=redis,
    )


@router.delete("/{slug}/members/{member_id}", status_code=204)
async def remove_member(
    slug: str,
    member_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    from websocket.manager import ws_manager
    await workspace_service.remove_member(
        slug=slug,
        member_id=member_id,
        current_user=current_user,
        session=db,
        ws_manager=ws_manager,
    )
