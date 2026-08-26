from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

from fastapi import FastAPI, Request, WebSocket, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import structlog

from core.config import settings
from core.exceptions import NexaChatException
from db.base import init_db
from routers import auth, workspaces, members, messages, ai, monitor, announcements
from websocket.consumer import ws_chat, ws_notify
from websocket.manager import ws_manager

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Starting NEXACHAT", env=settings.ENV)
    await init_db()

    # Initialise Redis if URL is configured
    try:
        import redis.asyncio as aioredis  # type: ignore
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
        await redis_client.ping()
        app.state.redis = redis_client
        await ws_manager.init_redis(redis_client)
        logger.info("Redis connected", url=settings.REDIS_URL)
    except Exception as e:
        logger.warning("Redis unavailable — running without pub/sub", error=str(e))
        app.state.redis = None

    yield

    # Shutdown
    await ws_manager.shutdown()
    if getattr(app.state, "redis", None):
        await app.state.redis.close()
    logger.info("NEXACHAT shutdown complete")


app = FastAPI(
    title="NEXACHAT API",
    version="1.0.0",
    description="Multi-tenant real-time business messaging platform",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.ENV != "prod" else None,
    redoc_url="/api/redoc" if settings.ENV != "prod" else None,
)

# ── Middleware ─────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Exception handlers ─────────────────────────────────────────────────────

@app.exception_handler(NexaChatException)
async def nexachat_exception_handler(request: Request, exc: NexaChatException) -> JSONResponse:
    code = exc.headers.get("X-Error-Code", "ERROR") if exc.headers else "ERROR"
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": code},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception", exc_info=exc, path=str(request.url))
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred", "code": "INTERNAL_ERROR"},
    )


# ── REST Routers ───────────────────────────────────────────────────────────

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(workspaces.router, prefix="/api/workspaces", tags=["workspaces"])
app.include_router(members.router, prefix="/api/workspaces", tags=["members"])
app.include_router(messages.router, prefix="/api/workspaces", tags=["messages"])
app.include_router(ai.router, prefix="/api/workspaces", tags=["ai"])
app.include_router(announcements.router, prefix="/api/workspaces", tags=["announcements"])
app.include_router(monitor.router, prefix="/system-monitor", tags=["monitor"])


# ── WebSocket routes ───────────────────────────────────────────────────────

@app.websocket("/ws/chat/{slug}")
async def websocket_chat(
    websocket: WebSocket,
    slug: str,
    token: Optional[str] = Query(default=None),
) -> None:
    await ws_chat(websocket, slug=slug, token=token)


@app.websocket("/ws/notify")
async def websocket_notify(
    websocket: WebSocket,
    token: Optional[str] = Query(default=None),
) -> None:
    await ws_notify(websocket, token=token)


# ── Health ─────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "app": settings.APP_NAME}

@app.get("/api/debug/cors")
async def debug_cors():
    return {
        "allowed_origins": settings.ALLOWED_ORIGINS,
        "env": settings.ENV,
    }