"""Unit tests for chat service — sanitisation, pagination, tenant isolation."""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from services.chat_service import _sanitise, save_message, get_messages, get_messages_for_ai_context
from services.auth_service import register_user
from services.workspace_service import create_workspace, get_room_for_workspace


# ── Property 10: Content sanitisation ────────────────────────────────────────

@pytest.mark.parametrize("raw,expected_safe", [
    ("<script>alert('xss')</script>Hello", "Hello"),
    ("<b>Bold</b> text", "Bold text"),
    ("Normal message", "Normal message"),
    ("<img src=x onerror=alert(1)>", ""),
    ("Hello <a href='evil'>World</a>", "Hello World"),
    ("  spaces  ", "spaces"),
])
def test_sanitise_removes_html(raw: str, expected_safe: str):
    result = _sanitise(raw)
    assert result == expected_safe, f"Expected '{expected_safe}', got '{result}'"


def test_sanitise_is_idempotent():
    """_sanitise(_sanitise(x)) == _sanitise(x)"""
    inputs = [
        "<script>evil()</script>Hello",
        "<b><i>nested</i></b>",
        "plain text",
        "   ",
    ]
    for text in inputs:
        once = _sanitise(text)
        twice = _sanitise(once)
        assert once == twice, f"Not idempotent for input '{text}': '{once}' → '{twice}'"


# ── Property 1: Approved-member-only message persistence ─────────────────────

@pytest.mark.asyncio
async def test_message_saved_with_correct_sender(db_session: AsyncSession):
    owner = await register_user("msg_owner@test.com", "pass1234", "Owner", db_session)
    workspace = await create_workspace(owner, "Test Shop", db_session)
    room = await get_room_for_workspace(workspace.id, db_session)

    message, sender_name = await save_message(
        room_id=room.id,
        sender_id=owner.id,
        content="Hello team",
        session=db_session,
    )

    assert message.content == "Hello team"
    assert message.sender_id == owner.id
    assert message.room_id == room.id
    assert sender_name == "Owner"


@pytest.mark.asyncio
async def test_message_content_is_sanitised_on_save(db_session: AsyncSession):
    owner = await register_user("san@test.com", "pass1234", "Owner", db_session)
    workspace = await create_workspace(owner, "Clean Shop", db_session)
    room = await get_room_for_workspace(workspace.id, db_session)

    message, _ = await save_message(
        room_id=room.id,
        sender_id=owner.id,
        content="<script>evil()</script>Safe text",
        session=db_session,
    )

    assert "<script>" not in message.content
    assert "Safe text" in message.content


# ── Property 8: Pagination completeness ──────────────────────────────────────

@pytest.mark.asyncio
async def test_pagination_covers_all_messages(db_session: AsyncSession):
    owner = await register_user("page@test.com", "pass1234", "Owner", db_session)
    workspace = await create_workspace(owner, "Page Shop", db_session)
    room = await get_room_for_workspace(workspace.id, db_session)

    n = 25
    for i in range(n):
        await save_message(room.id, owner.id, f"Message {i}", db_session)

    # Collect all messages via pagination
    all_ids = []
    cursor = None
    while True:
        rows, cursor = await get_messages(room.id, db_session, cursor=cursor, limit=10)
        all_ids.extend(str(msg.id) for msg, _ in rows)
        if not cursor:
            break

    assert len(all_ids) == n, f"Expected {n} messages, got {len(all_ids)}"
    assert len(set(all_ids)) == n, "Duplicate messages in pagination"


@pytest.mark.asyncio
async def test_pagination_returns_newest_first(db_session: AsyncSession):
    owner = await register_user("order@test.com", "pass1234", "Owner", db_session)
    workspace = await create_workspace(owner, "Order Shop", db_session)
    room = await get_room_for_workspace(workspace.id, db_session)

    for i in range(5):
        await save_message(room.id, owner.id, f"Msg {i}", db_session)

    rows, _ = await get_messages(room.id, db_session, limit=10)
    timestamps = [msg.timestamp for msg, _ in rows]

    # Should be descending (newest first)
    assert timestamps == sorted(timestamps, reverse=True)


# ── Property 3: AI context workspace scoping ─────────────────────────────────

@pytest.mark.asyncio
async def test_ai_context_scoped_to_workspace(db_session: AsyncSession):
    """Messages from workspace B must never appear in workspace A's AI context."""
    owner_a = await register_user("ow_a@test.com", "pass1234", "Owner A", db_session)
    owner_b = await register_user("ow_b@test.com", "pass1234", "Owner B", db_session)

    ws_a = await create_workspace(owner_a, "Workspace Alpha", db_session)
    ws_b = await create_workspace(owner_b, "Workspace Beta", db_session)

    room_a = await get_room_for_workspace(ws_a.id, db_session)
    room_b = await get_room_for_workspace(ws_b.id, db_session)

    await save_message(room_a.id, owner_a.id, "A-only message", db_session)
    await save_message(room_b.id, owner_b.id, "B-only message", db_session)

    # Get AI context for workspace A
    context_a = await get_messages_for_ai_context(
        room_id=room_a.id,
        workspace_id=ws_a.id,
        session=db_session,
        limit=10,
    )
    context_contents = [msg.content for msg, _ in context_a]

    assert "A-only message" in context_contents
    assert "B-only message" not in context_contents, "Workspace B data leaked into workspace A's AI context!"
