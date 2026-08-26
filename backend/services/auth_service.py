import uuid
from datetime import datetime, timezone

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from core.config import settings
from core.exceptions import (
    UserAlreadyExists,
    InvalidCredentials,
    InvalidToken,
    RateLimitExceeded,
)
from core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from models.user import User
from models.refresh_token import RefreshToken

logger = structlog.get_logger()

LOGIN_RATE_KEY = "login_attempts:{ip}"
LOGIN_MAX_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 900  # 15 minutes


async def register_user(
    email: str,
    password: str,
    full_name: str,
    db: AsyncSession,
) -> User:
    result = await db.execute(select(User).where(User.email == email.lower().strip()))
    if result.scalar_one_or_none():
        raise UserAlreadyExists()

    user = User(
        email=email.lower().strip(),
        password_hash=hash_password(password),
        full_name=full_name.strip(),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info("User registered", user_id=str(user.id))
    return user


async def authenticate_user(
    email: str,
    password: str,
    db: AsyncSession,
    redis=None,
    client_ip: str = "unknown",
) -> User:
    # Rate limiting via Redis (skip in tests when redis is None)
    if redis is not None:
        rate_key = LOGIN_RATE_KEY.format(ip=client_ip)
        attempts = await redis.incr(rate_key)
        if attempts == 1:
            await redis.expire(rate_key, LOGIN_WINDOW_SECONDS)
        if attempts > LOGIN_MAX_ATTEMPTS:
            raise RateLimitExceeded("Too many login attempts. Try again in 15 minutes.")

    result = await db.execute(
        select(User).where(User.email == email.lower().strip(), User.is_active == True)  # noqa: E712
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.password_hash):
        raise InvalidCredentials()

    # Clear rate limit on successful login
    if redis is not None:
        await redis.delete(LOGIN_RATE_KEY.format(ip=client_ip))

    return user


async def issue_tokens(
    user: User,
    db: AsyncSession,
) -> tuple[str, str]:
    """Returns (access_token, refresh_token)."""
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token_str, jti, expires_at = create_refresh_token(user.id)

    rt = RefreshToken(jti=jti, user_id=user.id, expires_at=expires_at)
    db.add(rt)
    await db.commit()

    return access_token, refresh_token_str


async def rotate_refresh_token(
    refresh_token_str: str,
    db: AsyncSession,
) -> tuple[str, str, User]:
    """Validates and rotates a refresh token. Returns (new_access, new_refresh, user)."""
    payload = decode_token(refresh_token_str)

    if payload.get("type") != "refresh":
        raise InvalidToken()

    try:
        jti = uuid.UUID(payload["jti"])
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        raise InvalidToken()

    # Look up the refresh token record
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.jti == jti,
            RefreshToken.user_id == user_id,
            RefreshToken.revoked == False,  # noqa: E712
        )
    )
    rt = result.scalar_one_or_none()
    if not rt:
        raise InvalidToken()

    if rt.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        # Revoke expired token and reject
        rt.revoked = True
        await db.commit()
        raise InvalidToken()

    # Revoke old token (rotation)
    rt.revoked = True
    await db.commit()

    # Load user
    user_result = await db.execute(
        select(User).where(User.id == user_id, User.is_active == True)  # noqa: E712
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise InvalidToken()

    access_token, new_refresh_token_str = await issue_tokens(user, db)
    return access_token, new_refresh_token_str, user


async def logout(
    refresh_token_str: str,
    db: AsyncSession,
) -> None:
    """Revokes the refresh token."""
    try:
        payload = decode_token(refresh_token_str)
        jti = uuid.UUID(payload.get("jti", ""))
        await db.execute(
            delete(RefreshToken).where(RefreshToken.jti == jti)
        )
        await db.commit()
    except Exception:
        # Logout should never fail visibly — token may already be gone
        pass


async def clean_expired_refresh_tokens(user_id: uuid.UUID, db: AsyncSession) -> None:
    """Housekeeping: remove expired tokens for a user."""
    await db.execute(
        delete(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.expires_at < datetime.now(timezone.utc),
        )
    )
    await db.commit()
