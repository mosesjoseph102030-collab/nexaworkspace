# NEXACHAT

> Multi-tenant real-time business messaging — private, AI-assisted, owner-controlled.

## Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI + SQLAlchemy 2 async + Alembic |
| Real-time | WebSockets + Redis pub/sub |
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Database | PostgreSQL (prod) / SQLite (dev) |
| AI | OpenAI / Anthropic (configurable) |
| Deploy | Render / Railway / Docker |

---

## Quick Start (local)

### Prerequisites
- Python 3.12+
- Node 20+
- Docker + Docker Compose (optional but easiest)

### With Docker Compose

```bash
cp env.example .env
# Fill in SECRET_KEY and OPENAI_API_KEY in .env

docker compose up
```

- Backend: http://localhost:8000/api/docs
- Frontend: http://localhost:5173

---

### Without Docker

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp ../env.example .env
# Edit .env — DATABASE_URL defaults to SQLite (zero setup)

uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

---

## Environment Variables

See [`env.example`](./env.example) for all required variables.

Critical ones:
- `SECRET_KEY` — generate with `python -c "import secrets; print(secrets.token_hex(32))"`
- `DATABASE_URL` — SQLite for dev, `postgresql+asyncpg://...` for prod
- `REDIS_URL` — Required for multi-instance WebSocket scaling
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` — At least one required for AI features

---

## Project Structure

```
nexachat/
├── backend/
│   ├── core/          # Config, security, exceptions, dependencies
│   ├── db/            # SQLAlchemy engine, session, Alembic migrations
│   ├── models/        # ORM models (User, Workspace, Member, Room, Message)
│   ├── schemas/       # Pydantic v2 request/response schemas
│   ├── routers/       # FastAPI route handlers
│   ├── services/      # Business logic (auth, workspace, chat, AI)
│   ├── websocket/     # WS consumer, connection manager, event types
│   └── tests/         # pytest unit + integration tests
├── frontend/
│   └── src/
│       ├── api/       # Axios client + typed endpoint wrappers
│       ├── components/ # UI, chat, layout, workspace components
│       ├── hooks/     # useWebSocket, useChat, usePresence
│       ├── pages/     # All route pages
│       ├── stores/    # Zustand (auth, chat state)
│       ├── theme/     # ThemeProvider, design tokens
│       └── types/     # Shared TypeScript interfaces
├── docker-compose.yml
├── render.yaml
└── env.example
```

---

## Phased Build

| Phase | Status | Scope |
|---|---|---|
| 1 | ✅ | Foundation, auth, workspace slug routing |
| 2 | ✅ | Membership approval flow + real-time notifications |
| 3 | ✅ | Real-time chat (WebSocket, typing, presence) |
| 4 | ✅ | AI features (smart replies, summaries) |
| 5 | ✅ | UI polish, dark/light mode, mobile-first |
| 6 | ✅ | Docker, CI, deployment config |

---

## Running Tests

```bash
cd backend
pytest tests/ -x --tb=short
```

---

## Deployment

See [`render.yaml`](./render.yaml) for Render configuration.
Supports zero-downtime deploys. Health check endpoint: `/system-monitor/health`.
