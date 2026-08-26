from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from sqlalchemy.orm import DeclarativeBase

from core.config import settings


class Base(DeclarativeBase):
    pass


def get_engine() -> AsyncEngine:
    url = settings.DATABASE_URL
    kwargs: dict = {}
    if url.startswith("postgresql+asyncpg") or url.startswith("mysql+aiomysql"):
        kwargs = {
            "pool_size": 5,
            "max_overflow": 15,
            "pool_pre_ping": True,
            "pool_recycle": 3600,
        }
    return create_async_engine(url, echo=settings.DEBUG, **kwargs)


engine = get_engine()


async def init_db() -> None:
    """Create all tables on startup (dev only — prod uses Alembic)."""
    if settings.ENV == "dev":
        async with engine.begin() as conn:
            from models import user, workspace, workspace_member, chat_room, message, refresh_token, announcement  # noqa: F401
            await conn.run_sync(Base.metadata.create_all)
