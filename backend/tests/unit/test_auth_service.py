"""Unit tests for auth service."""
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth_service import register_user, authenticate_user, issue_tokens, rotate_refresh_token, logout
from core.exceptions import UserAlreadyExists, InvalidCredentials, InvalidToken


@pytest.mark.asyncio
async def test_register_user_success(db_session: AsyncSession):
    user = await register_user(
        email="test@example.com",
        password="password123",
        full_name="Test User",
        db=db_session,
    )
    assert user.email == "test@example.com"
    assert user.full_name == "Test User"
    assert user.is_active is True
    assert user.password_hash != "password123"  # Must be hashed


@pytest.mark.asyncio
async def test_register_duplicate_email_raises(db_session: AsyncSession):
    await register_user("dup@example.com", "pass1234", "User One", db_session)
    with pytest.raises(UserAlreadyExists):
        await register_user("dup@example.com", "pass1234", "User Two", db_session)


@pytest.mark.asyncio
async def test_register_email_normalised(db_session: AsyncSession):
    user = await register_user("  UPPER@Example.COM  ", "pass1234", "Test", db_session)
    assert user.email == "upper@example.com"


@pytest.mark.asyncio
async def test_authenticate_user_success(db_session: AsyncSession):
    await register_user("auth@example.com", "correct_pass", "Auth User", db_session)
    user = await authenticate_user("auth@example.com", "correct_pass", db_session)
    assert user.email == "auth@example.com"


@pytest.mark.asyncio
async def test_authenticate_wrong_password_raises(db_session: AsyncSession):
    await register_user("wrong@example.com", "correct_pass", "Test", db_session)
    with pytest.raises(InvalidCredentials):
        await authenticate_user("wrong@example.com", "wrong_pass", db_session)


@pytest.mark.asyncio
async def test_authenticate_unknown_email_raises(db_session: AsyncSession):
    with pytest.raises(InvalidCredentials):
        await authenticate_user("nobody@example.com", "pass", db_session)


@pytest.mark.asyncio
async def test_refresh_token_rotation(db_session: AsyncSession):
    """Property 6: Refresh token must only work once (single-use rotation)."""
    user = await register_user("rotate@example.com", "pass1234", "Rotate User", db_session)
    access1, refresh1 = await issue_tokens(user, db_session)

    # First rotation succeeds
    access2, refresh2, _ = await rotate_refresh_token(refresh1, db_session)
    assert access2 != access1

    # Second use of original token must fail (token revoked)
    with pytest.raises(InvalidToken):
        await rotate_refresh_token(refresh1, db_session)


@pytest.mark.asyncio
async def test_logout_invalidates_token(db_session: AsyncSession):
    user = await register_user("logout@example.com", "pass1234", "Logout User", db_session)
    _, refresh = await issue_tokens(user, db_session)

    await logout(refresh, db_session)

    with pytest.raises(InvalidToken):
        await rotate_refresh_token(refresh, db_session)
