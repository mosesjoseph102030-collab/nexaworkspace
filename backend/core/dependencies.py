import uuid

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.session import get_db
from core.security import decode_token
from core.exceptions import InvalidToken, NotWorkspaceOwner
from models.user import User
from models.workspace import Workspace

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise InvalidToken()
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise InvalidToken()
    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise InvalidToken()
    result = await db.execute(
        select(User).where(User.id == user_id, User.is_active == True)  # noqa: E712
    )
    user = result.scalar_one_or_none()
    if not user:
        raise InvalidToken()
    return user


def require_workspace_owner(workspace: Workspace, current_user: User) -> None:
    if workspace.owner_id != current_user.id:
        raise NotWorkspaceOwner()
