"""Integration tests for workspace and member endpoints."""
import pytest
from httpx import AsyncClient


async def _create_user_and_token(client: AsyncClient, email: str, name: str = "Test") -> str:
    resp = await client.post("/api/auth/register", json={
        "email": email,
        "password": "pass1234",
        "full_name": name,
    })
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_create_workspace(client: AsyncClient):
    token = await _create_user_and_token(client, "ws@test.com", "WS Owner")
    resp = await client.post(
        "/api/workspaces",
        json={"name": "Felix Bakery"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["slug"] == "felix-bakery"
    assert data["name"] == "Felix Bakery"


@pytest.mark.asyncio
async def test_get_workspace_public(client: AsyncClient):
    token = await _create_user_and_token(client, "pub@test.com")
    await client.post(
        "/api/workspaces",
        json={"name": "Public Shop"},
        headers={"Authorization": f"Bearer {token}"},
    )
    resp = await client.get("/api/workspaces/public-shop")
    assert resp.status_code == 200
    assert resp.json()["slug"] == "public-shop"


@pytest.mark.asyncio
async def test_get_workspace_not_found_404(client: AsyncClient):
    resp = await client.get("/api/workspaces/nonexistent-workspace")
    assert resp.status_code == 404
    assert resp.json()["code"] == "WORKSPACE_NOT_FOUND"


@pytest.mark.asyncio
async def test_reserved_slug_rejected(client: AsyncClient):
    token = await _create_user_and_token(client, "res@test.com")
    resp = await client.post(
        "/api/workspaces",
        json={"name": "api"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "RESERVED_SLUG"


@pytest.mark.asyncio
async def test_member_request_and_approval_flow(client: AsyncClient):
    """Property 2 prerequisite: member must be approved before accessing workspace."""
    # Owner
    owner_token = await _create_user_and_token(client, "owner2@test.com", "Owner")
    await client.post(
        "/api/workspaces",
        json={"name": "My Shop"},
        headers={"Authorization": f"Bearer {owner_token}"},
    )

    # Staff member requests to join
    staff_token = await _create_user_and_token(client, "staff@test.com", "Staff Member")
    req_resp = await client.post(
        "/api/workspaces/my-shop/members/request",
        json={"display_name": "Maria"},
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert req_resp.status_code == 201
    member_id = req_resp.json()["id"]
    assert req_resp.json()["approved"] is False

    # Staff cannot access messages before approval
    msg_resp = await client.get(
        "/api/workspaces/my-shop/messages",
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert msg_resp.status_code == 403

    # Owner approves
    approve_resp = await client.post(
        f"/api/workspaces/my-shop/members/{member_id}/approve",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert approve_resp.status_code == 200
    assert approve_resp.json()["approved"] is True

    # Now staff can access messages
    msg_resp2 = await client.get(
        "/api/workspaces/my-shop/messages",
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert msg_resp2.status_code == 200


@pytest.mark.asyncio
async def test_non_owner_cannot_list_members(client: AsyncClient):
    owner_token = await _create_user_and_token(client, "o3@test.com", "Owner3")
    await client.post(
        "/api/workspaces",
        json={"name": "Secret Shop"},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    other_token = await _create_user_and_token(client, "other@test.com", "Other")
    resp = await client.get(
        "/api/workspaces/secret-shop/members",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_cross_workspace_data_isolation(client: AsyncClient):
    """Property 4: Messages from workspace A must not appear in workspace B responses."""
    token_a = await _create_user_and_token(client, "wa@test.com", "Owner A")
    token_b = await _create_user_and_token(client, "wb@test.com", "Owner B")

    await client.post("/api/workspaces", json={"name": "Alpha Store"},
                      headers={"Authorization": f"Bearer {token_a}"})
    await client.post("/api/workspaces", json={"name": "Beta Store"},
                      headers={"Authorization": f"Bearer {token_b}"})

    # Send message in workspace A
    await client.post("/api/workspaces/alpha-store/messages",
                      json={"content": "Alpha-only message"},
                      headers={"Authorization": f"Bearer {token_a}"})

    # Workspace B should have no messages
    resp_b = await client.get("/api/workspaces/beta-store/messages",
                               headers={"Authorization": f"Bearer {token_b}"})
    assert resp_b.status_code == 200
    msgs = resp_b.json()["messages"]
    contents = [m["content"] for m in msgs]
    assert "Alpha-only message" not in contents
