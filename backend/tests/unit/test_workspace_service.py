"""Unit tests for workspace service — slug generation, uniqueness, reserved slugs."""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from services.workspace_service import generate_slug, ensure_unique_slug, create_workspace
from services.auth_service import register_user
from core.exceptions import ReservedSlug


# ── Property 7: Slug generation produces valid, URL-safe identifiers ────────

@pytest.mark.parametrize("name,expected", [
    ("Felix Bakery", "felix-bakery"),
    ("Joe's Garage", "joes-garage"),
    ("  Spaces  ", "spaces"),
    ("Café & Bistro", "caf-bistro"),
    ("UPPER CASE", "upper-case"),
    ("Multiple   Spaces", "multiple-spaces"),
    ("---leading-trailing---", "leading-trailing"),
    ("a" * 60, "a" * 50),  # Truncation
])
def test_generate_slug_valid(name: str, expected: str):
    result = generate_slug(name)
    assert result == expected, f"Expected '{expected}', got '{result}'"


def test_generate_slug_only_lowercase():
    result = generate_slug("NEXACHAT Platform")
    assert result == result.lower()


def test_generate_slug_no_special_chars():
    import re
    result = generate_slug("Hello! World@ #2024")
    assert re.match(r'^[a-z0-9-]+$', result), f"Slug contains invalid chars: {result}"


def test_generate_slug_no_leading_trailing_hyphens():
    result = generate_slug("---name---")
    assert not result.startswith('-')
    assert not result.endswith('-')


def test_generate_slug_max_50_chars():
    result = generate_slug("a" * 200)
    assert len(result) <= 50


# ── Property 5: Reserved slug rejection ─────────────────────────────────────

@pytest.mark.asyncio
@pytest.mark.parametrize("reserved", ["api", "admin", "system-monitor", "www"])
async def test_reserved_slug_rejected(reserved: str, db_session: AsyncSession):
    with pytest.raises(ReservedSlug):
        await ensure_unique_slug(db_session, reserved)


# ── Slug uniqueness: collision → suffix ─────────────────────────────────────

@pytest.mark.asyncio
async def test_slug_uniqueness_suffix_on_collision(db_session: AsyncSession):
    owner = await register_user("owner@example.com", "pass1234", "Owner", db_session)

    ws1 = await create_workspace(owner, "Felix Bakery", db_session)
    ws2 = await create_workspace(owner, "Felix Bakery", db_session)

    assert ws1.slug == "felix-bakery"
    assert ws2.slug == "felix-bakery-2"
    assert ws1.slug != ws2.slug


@pytest.mark.asyncio
async def test_create_workspace_auto_creates_chat_room(db_session: AsyncSession):
    from sqlalchemy import select
    from models.chat_room import ChatRoom

    owner = await register_user("room@example.com", "pass1234", "Room Owner", db_session)
    workspace = await create_workspace(owner, "Test Shop", db_session)

    result = await db_session.execute(
        select(ChatRoom).where(ChatRoom.workspace_id == workspace.id)
    )
    room = result.scalar_one_or_none()
    assert room is not None
    assert room.name == "general"
