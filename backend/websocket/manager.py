"""
ConnectionManager — handles workspace and personal WebSocket channels.

Architecture:
- active_connections: in-process connections per workspace
- personal_connections: in-process connections per user (for approvals)
- Redis pub/sub bridges connections across multiple server instances

Channel naming:
- workspace channels: "workspace:{workspace_id}"
- personal channels:  "user:{user_id}"
"""
from __future__ import annotations

import asyncio
import json
import uuid
from collections import defaultdict
from typing import Any

import structlog
from fastapi import WebSocket

logger = structlog.get_logger()


class ConnectionManager:
    def __init__(self) -> None:
        # workspace_id → set of (websocket, user_id)
        self.active_connections: dict[uuid.UUID, set[tuple[WebSocket, uuid.UUID]]] = defaultdict(set)
        # user_id → set of websockets (personal channel)
        self.personal_connections: dict[uuid.UUID, set[WebSocket]] = defaultdict(set)
        self._redis = None
        self._pubsub = None
        self._listener_task: asyncio.Task | None = None
        self._subscribed_channels: set[str] = set()

    async def init_redis(self, redis) -> None:
        """Call this after Redis is connected in app lifespan."""
        self._redis = redis
        self._pubsub = redis.pubsub()
        self._listener_task = asyncio.create_task(self._redis_listener())
        logger.info("ConnectionManager Redis pub/sub initialised")

    async def shutdown(self) -> None:
        if self._listener_task:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
        if self._pubsub:
            await self._pubsub.close()

    # ── Workspace connections ───────────────────────────────────────────────

    async def connect(
        self,
        websocket: WebSocket,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
        display_name: str,
    ) -> None:
        self.active_connections[workspace_id].add((websocket, user_id))

        channel = f"workspace:{workspace_id}"
        if channel not in self._subscribed_channels and self._pubsub:
            await self._pubsub.subscribe(channel)
            self._subscribed_channels.add(channel)

        await self._broadcast_workspace(
            workspace_id,
            {
                "type": "presence",
                "user_id": str(user_id),
                "display_name": display_name,
                "status": "online",
            },
            exclude_ws=None,
        )
        logger.info("WS connected", workspace_id=str(workspace_id), user_id=str(user_id))

    async def disconnect(
        self,
        websocket: WebSocket,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
        display_name: str,
    ) -> None:
        self.active_connections[workspace_id].discard((websocket, user_id))

        # Only broadcast offline if user has no other connections in this workspace
        user_still_connected = any(
            uid == user_id
            for _, uid in self.active_connections[workspace_id]
        )
        if not user_still_connected:
            await self._broadcast_workspace(
                workspace_id,
                {
                    "type": "presence",
                    "user_id": str(user_id),
                    "display_name": display_name,
                    "status": "offline",
                },
            )
        logger.info("WS disconnected", workspace_id=str(workspace_id), user_id=str(user_id))

    async def broadcast_to_workspace(
        self,
        workspace_id: uuid.UUID,
        event: dict[str, Any],
        exclude_user_id: uuid.UUID | None = None,
    ) -> None:
        """Broadcast via Redis so all server instances receive it."""
        if self._redis:
            payload = json.dumps({"channel": f"workspace:{workspace_id}", "event": event})
            await self._redis.publish(f"workspace:{workspace_id}", json.dumps(event))
        else:
            # Dev fallback: direct delivery without Redis
            await self._broadcast_workspace(workspace_id, event)

    async def _broadcast_workspace(
        self,
        workspace_id: uuid.UUID,
        event: dict[str, Any],
        exclude_ws: WebSocket | None = None,
    ) -> None:
        """Deliver to local in-process connections for this workspace."""
        message = json.dumps(event)
        dead: list[tuple[WebSocket, uuid.UUID]] = []
        for ws, uid in list(self.active_connections.get(workspace_id, set())):
            if ws is exclude_ws:
                continue
            try:
                await ws.send_text(message)
            except Exception:
                dead.append((ws, uid))
        for entry in dead:
            self.active_connections[workspace_id].discard(entry)

    # ── Personal connections ────────────────────────────────────────────────

    async def connect_personal(self, websocket: WebSocket, user_id: uuid.UUID) -> None:
        self.personal_connections[user_id].add(websocket)
        channel = f"user:{user_id}"
        if channel not in self._subscribed_channels and self._pubsub:
            await self._pubsub.subscribe(channel)
            self._subscribed_channels.add(channel)

    async def disconnect_personal(self, websocket: WebSocket, user_id: uuid.UUID) -> None:
        self.personal_connections[user_id].discard(websocket)

    async def send_personal(self, user_id: uuid.UUID, event: dict[str, Any]) -> None:
        """Send to a specific user. Falls back to local if Redis unavailable."""
        if self._redis:
            await self._redis.publish(f"user:{user_id}", json.dumps(event))
        else:
            await self._deliver_personal(user_id, event)

    async def _deliver_personal(self, user_id: uuid.UUID, event: dict[str, Any]) -> None:
        message = json.dumps(event)
        dead: list[WebSocket] = []
        for ws in list(self.personal_connections.get(user_id, set())):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.personal_connections[user_id].discard(ws)

    # ── Presence helpers ────────────────────────────────────────────────────

    def get_online_users(self, workspace_id: uuid.UUID) -> list[dict]:
        """Return a list of {user_id, display_name, status} for all currently-connected
        users in a workspace. Used to seed the presence snapshot for new joiners."""
        # We only store (websocket, user_id) — display_name is not in active_connections.
        # So we return the unique user_ids; the consumer supplies the display_name from context.
        seen: dict[uuid.UUID, None] = {}
        for _, uid in self.active_connections.get(workspace_id, set()):
            seen[uid] = None
        return [str(uid) for uid in seen]

    # ── Force-kick user ────────────────────────────────────────────────────

    async def kick_user(self, workspace_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """Close all WS connections for a user in a given workspace (on removal)."""
        to_close = [
            ws for ws, uid in list(self.active_connections.get(workspace_id, set()))
            if uid == user_id
        ]
        for ws in to_close:
            try:
                await ws.close(code=4003)
            except Exception:
                pass

    # ── Redis listener ─────────────────────────────────────────────────────

    async def _redis_listener(self) -> None:
        """Background task: receive Redis pub/sub messages and deliver locally."""
        if not self._pubsub:
            return
        try:
            async for message in self._pubsub.listen():
                if message["type"] != "message":
                    continue
                channel: str = message["channel"]
                if isinstance(channel, bytes):
                    channel = channel.decode()
                try:
                    event = json.loads(message["data"])
                except (json.JSONDecodeError, TypeError):
                    continue

                if channel.startswith("workspace:"):
                    try:
                        workspace_id = uuid.UUID(channel.split(":", 1)[1])
                        await self._broadcast_workspace(workspace_id, event)
                    except (ValueError, IndexError):
                        pass

                elif channel.startswith("user:"):
                    try:
                        user_id = uuid.UUID(channel.split(":", 1)[1])
                        await self._deliver_personal(user_id, event)
                    except (ValueError, IndexError):
                        pass
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error("Redis listener crashed", error=str(e))


# Singleton — imported by consumer and routers
ws_manager = ConnectionManager()
