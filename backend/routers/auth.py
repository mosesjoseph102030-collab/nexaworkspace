from typing import Optional

from fastapi import APIRouter, Depends, Request, Response, Cookie
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.dependencies import get_current_user
from core.exceptions import InvalidToken
from db.session import get_db
from models.user import User
from schemas.auth import LoginRequest, RegisterRequest, LoginResponse, TokenResponse, UserResponse
from services import auth_service

router = APIRouter()

REFRESH_COOKIE_NAME = "refresh_token"


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="strict",
        secure=settings.ENV == "prod",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/api/auth")


@router.post("/register", response_model=LoginResponse, status_code=201)
async def register(
    body: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    user = await auth_service.register_user(
        email=body.email,
        password=body.password,
        full_name=body.full_name,
        db=db,
    )
    access_token, refresh_token = await auth_service.issue_tokens(user, db)
    _set_refresh_cookie(response, refresh_token)
    return LoginResponse(access_token=access_token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    client_ip = request.client.host if request.client else "unknown"
    user = await auth_service.authenticate_user(
        email=body.email,
        password=body.password,
        db=db,
        client_ip=client_ip,
    )
    access_token, refresh_token = await auth_service.issue_tokens(user, db)
    _set_refresh_cookie(response, refresh_token)
    return LoginResponse(access_token=access_token, user=UserResponse.model_validate(user))


@router.post("/login/form", response_model=TokenResponse, include_in_schema=False)
async def login_form(
    form: OAuth2PasswordRequestForm = Depends(),
    request: Request = None,  # type: ignore[assignment]
    response: Response = None,  # type: ignore[assignment]
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """OAuth2 form login — used by Swagger UI."""
    client_ip = request.client.host if request and request.client else "unknown"
    user = await auth_service.authenticate_user(
        email=form.username,
        password=form.password,
        db=db,
        client_ip=client_ip,
    )
    access_token, refresh_token = await auth_service.issue_tokens(user, db)
    _set_refresh_cookie(response, refresh_token)
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    if not refresh_token:
        raise InvalidToken()
    access_token, new_refresh_token, _ = await auth_service.rotate_refresh_token(
        refresh_token_str=refresh_token,
        db=db,
    )
    _set_refresh_cookie(response, new_refresh_token)
    return TokenResponse(access_token=access_token)


@router.post("/logout", status_code=204)
async def logout(
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> None:
    if refresh_token:
        await auth_service.logout(refresh_token_str=refresh_token, db=db)
    _clear_refresh_cookie(response)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


from sqlalchemy import select as sa_select
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember


@router.get("/my-workspaces")
async def my_workspaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Returns workspaces the current user owns and workspaces they are a member of.
    Used after login to determine smart redirect.
    """
    # Workspaces owned
    owned_result = await db.execute(
        sa_select(Workspace).where(
            Workspace.owner_id == current_user.id,
            Workspace.is_active == True,  # noqa: E712
        ).order_by(Workspace.created_at.desc()).limit(1)
    )
    owned = owned_result.scalars().all()

    # Workspaces as approved member
    member_result = await db.execute(
        sa_select(Workspace)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(
            WorkspaceMember.user_id == current_user.id,
            WorkspaceMember.approved == True,  # noqa: E712
            Workspace.is_active == True,  # noqa: E712
        )
        .order_by(WorkspaceMember.joined_at.desc())
        .limit(1)
    )
    member_of = member_result.scalars().all()

    return {
        "owned": [{"id": str(w.id), "slug": w.slug, "name": w.name} for w in owned],
        "member_of": [{"id": str(w.id), "slug": w.slug, "name": w.name} for w in member_of],
    }
