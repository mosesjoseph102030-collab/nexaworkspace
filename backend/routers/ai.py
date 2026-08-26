from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import get_current_user
from core.exceptions import NotWorkspaceMember
from db.session import get_db
from models.user import User
from models.workspace_member import WorkspaceMember
from schemas.ai import (
    SmartReplyRequest,
    SmartReplyResponse,
    SummaryRequest,
    SummaryResponse,
)
from services import ai_service
from services.workspace_service import get_workspace_by_slug
from sqlalchemy import select

router = APIRouter()


async def _require_approved(slug: str, current_user: User, db: AsyncSession) -> None:
    workspace = await get_workspace_by_slug(slug, db)
    if workspace.owner_id == current_user.id:
        return
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == current_user.id,
            WorkspaceMember.approved == True,  # noqa: E712
        )
    )
    if result.scalar_one_or_none() is None:
        raise NotWorkspaceMember()


@router.post("/{slug}/ai/smart-replies", response_model=SmartReplyResponse)
async def smart_replies(
    slug: str,
    body: SmartReplyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SmartReplyResponse:
    await _require_approved(slug, current_user, db)
    redis = getattr(request.app.state, "redis", None)
    suggestions = await ai_service.get_smart_replies(
        slug=slug,
        last_message_id=body.last_message_id,
        session=db,
        redis=redis,
    )
    return SmartReplyResponse(suggestions=suggestions)


@router.post("/{slug}/ai/summary", response_model=SummaryResponse)
async def conversation_summary(
    slug: str,
    body: SummaryRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SummaryResponse:
    await _require_approved(slug, current_user, db)
    redis = getattr(request.app.state, "redis", None)
    result = await ai_service.summarise(
        slug=slug,
        last_n_messages=body.last_n_messages,
        session=db,
        redis=redis,
    )
    return SummaryResponse(**result)
