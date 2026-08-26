import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class WorkspaceCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Workspace name is required")
        if len(v) > 100:
            raise ValueError("Workspace name must be 100 characters or fewer")
        return v


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Workspace name cannot be empty")
        return v


class WorkspacePublicResponse(BaseModel):
    """Returned without auth — just enough to render the landing/join page."""
    id: uuid.UUID
    name: str
    slug: str
    owner_name: str

    model_config = {"from_attributes": True}


class WorkspaceResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    owner_id: uuid.UUID
    created_at: datetime
    is_active: bool

    model_config = {"from_attributes": True}


# ── Member schemas ──────────────────────────────────────────────────────────

class MembershipRequest(BaseModel):
    display_name: str

    @field_validator("display_name")
    @classmethod
    def display_name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Display name is required")
        if len(v) > 100:
            raise ValueError("Display name must be 100 characters or fewer")
        return v


class MemberResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    display_name: str
    approved: bool
    joined_at: datetime

    model_config = {"from_attributes": True}


class MemberStatusResponse(BaseModel):
    status: str  # "none" | "pending" | "approved" | "owner"
