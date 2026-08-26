import uuid
from typing import Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import get_current_user
from db.session import get_db
from models.user import User
from schemas.workspace import (
    WorkspaceCreate,
    WorkspaceUpdate,
    WorkspaceResponse,
    WorkspacePublicResponse,
)
from services import workspace_service

router = APIRouter()


@router.post("", response_model=WorkspaceResponse, status_code=201)
async def create_workspace(
    body: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceResponse:
    workspace = await workspace_service.create_workspace(
        owner=current_user,
        name=body.name,
        session=db,
    )
    return WorkspaceResponse.model_validate(workspace)


@router.get("/{slug}", response_model=WorkspacePublicResponse)
async def get_workspace(
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> WorkspacePublicResponse:
    workspace = await workspace_service.get_workspace_by_slug(slug, db)
    # Load owner name
    from sqlalchemy import select
    from models.user import User as UserModel
    owner_result = await db.execute(
        select(UserModel).where(UserModel.id == workspace.owner_id)
    )
    owner = owner_result.scalar_one_or_none()
    return WorkspacePublicResponse(
        id=workspace.id,
        name=workspace.name,
        slug=workspace.slug,
        owner_name=owner.full_name if owner else "Unknown",
    )


@router.patch("/{slug}", response_model=WorkspaceResponse)
async def update_workspace(
    slug: str,
    body: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceResponse:
    workspace = await workspace_service.update_workspace(
        slug=slug,
        name=body.name,
        current_user=current_user,
        session=db,
    )
    return WorkspaceResponse.model_validate(workspace)


@router.delete("/{slug}", status_code=204)
async def delete_workspace(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await workspace_service.delete_workspace(
        slug=slug,
        current_user=current_user,
        session=db,
    )
