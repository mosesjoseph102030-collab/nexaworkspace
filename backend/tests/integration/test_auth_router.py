"""Integration tests for /api/auth endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_creates_user(client: AsyncClient):
    response = await client.post("/api/auth/register", json={
        "email": "new@test.com",
        "password": "password123",
        "full_name": "New User",
    })
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "new@test.com"


@pytest.mark.asyncio
async def test_register_duplicate_email_409(client: AsyncClient):
    payload = {"email": "dup@test.com", "password": "pass1234", "full_name": "Dup"}
    await client.post("/api/auth/register", json=payload)
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 409
    assert response.json()["code"] == "USER_EXISTS"


@pytest.mark.asyncio
async def test_register_weak_password_422(client: AsyncClient):
    response = await client.post("/api/auth/register", json={
        "email": "weak@test.com",
        "password": "short",
        "full_name": "Weak",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "email": "login@test.com",
        "password": "pass1234",
        "full_name": "Login User",
    })
    response = await client.post("/api/auth/login", json={
        "email": "login@test.com",
        "password": "pass1234",
    })
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_login_wrong_password_401(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "email": "loginwrong@test.com",
        "password": "correct",
        "full_name": "Test",
    })
    response = await client.post("/api/auth/login", json={
        "email": "loginwrong@test.com",
        "password": "wrong",
    })
    assert response.status_code == 401
    assert response.json()["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_get_me_requires_auth(client: AsyncClient):
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_with_token(client: AsyncClient):
    reg = await client.post("/api/auth/register", json={
        "email": "me@test.com",
        "password": "pass1234",
        "full_name": "Me User",
    })
    token = reg.json()["access_token"]
    response = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == "me@test.com"


@pytest.mark.asyncio
async def test_refresh_token_rotation(client: AsyncClient):
    """Property 6: Refresh token is single-use."""
    await client.post("/api/auth/register", json={
        "email": "refresh@test.com",
        "password": "pass1234",
        "full_name": "Refresh User",
    })
    login_resp = await client.post("/api/auth/login", json={
        "email": "refresh@test.com",
        "password": "pass1234",
    })
    # Refresh cookie is httpOnly — simulate via cookie jar
    assert login_resp.status_code == 200

    # First refresh succeeds
    refresh1 = await client.post("/api/auth/refresh")
    assert refresh1.status_code == 200

    # Second refresh with same cookie should fail (cookie was rotated)
    refresh2 = await client.post("/api/auth/refresh")
    assert refresh2.status_code == 401
