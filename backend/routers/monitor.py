"""
System monitor — hidden admin route returning health checks and aggregate stats.
"""
from fastapi import APIRouter, Request
from sqlalchemy import text, func, select
import asyncio

from db.session import async_session_factory
from models.user import User
from models.workspace import Workspace
from models.message import Message

router = APIRouter()


async def _check_db() -> dict:
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


async def _check_redis(redis) -> dict:
    if redis is None:
        return {"status": "not_configured"}
    try:
        await asyncio.wait_for(redis.ping(), timeout=2.0)
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


async def _check_ai() -> dict:
    from core.config import settings
    if not settings.OPENAI_API_KEY and not settings.ANTHROPIC_API_KEY:
        return {"status": "not_configured"}
    # Just verify the key is present — don't make an actual API call
    provider = settings.AI_PROVIDER
    key_present = bool(
        settings.OPENAI_API_KEY if provider == "openai" else settings.ANTHROPIC_API_KEY
    )
    return {"status": "healthy" if key_present else "unhealthy", "provider": provider}


async def _get_stats() -> dict:
    try:
        async with async_session_factory() as session:
            user_count = await session.scalar(select(func.count(User.id)))
            workspace_count = await session.scalar(
                select(func.count(Workspace.id)).where(Workspace.is_active == True)  # noqa: E712
            )
            message_count = await session.scalar(select(func.count(Message.id)))
        return {
            "total_users": user_count or 0,
            "active_workspaces": workspace_count or 0,
            "total_messages": message_count or 0,
        }
    except Exception:
        return {"total_users": 0, "active_workspaces": 0, "total_messages": 0}


@router.get("/health")
async def health_check(request: Request) -> dict:
    redis = getattr(request.app.state, "redis", None)

    db_status, redis_status, ai_status = await asyncio.gather(
        _check_db(),
        _check_redis(redis),
        _check_ai(),
    )

    services = {
        "database": db_status,
        "redis": redis_status,
        "ai": ai_status,
    }

    all_healthy = all(
        s.get("status") in ("healthy", "not_configured")
        for s in services.values()
    )

    return {
        "status": "healthy" if all_healthy else "degraded",
        "services": services,
    }


@router.get("/stats")
async def system_stats() -> dict:
    return await _get_stats()
