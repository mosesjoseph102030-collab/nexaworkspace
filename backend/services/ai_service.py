"""
AI service — provider-agnostic smart replies and conversation summaries.

Design principles:
- Tenant isolation: only workspace-scoped messages ever reach the AI provider
- Provider abstraction: swap OpenAI ↔ Anthropic via config, zero calling-code changes
- Graceful degradation: on any provider failure, return empty results (never crash chat)
- Rate limiting: per-workspace, enforced via Redis (30 requests/hour combined)
"""
from __future__ import annotations

import json
import uuid
from typing import Optional

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.exceptions import AIServiceUnavailable, RateLimitExceeded
from models.message import Message
from services.chat_service import get_messages_for_ai_context, get_room_for_workspace
from services.workspace_service import get_workspace_by_slug

logger = structlog.get_logger()

AI_RATE_KEY = "ai_rate:{workspace_id}"


async def _check_rate_limit(workspace_id: uuid.UUID, redis) -> None:
    """Raises RateLimitExceeded if workspace has exceeded hourly AI call limit."""
    if redis is None:
        return
    key = AI_RATE_KEY.format(workspace_id=str(workspace_id))
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 3600)
    if count > settings.AI_RATE_LIMIT_PER_HOUR:
        raise RateLimitExceeded("AI feature rate limit reached. Try again next hour.")


def _build_smart_reply_prompt(
    context_messages: list[tuple[Message, str]],
    last_message_content: str,
    workspace_name: str,
) -> list[dict]:
    """Build OpenAI/Anthropic messages array for smart reply generation."""
    system_prompt = (
        f"You are a helpful assistant for '{workspace_name}', a workplace team chat. "
        "Your job is to suggest 2-3 short, natural reply options for the last message. "
        "Replies should be professional yet conversational, brief (under 15 words each), "
        "and appropriate for a work environment. "
        "Respond ONLY with a JSON array of strings, like: [\"Reply 1\", \"Reply 2\", \"Reply 3\"]. "
        "No explanation, no markdown, just the JSON array."
    )

    # Build context from recent messages (oldest first for context)
    context_lines = []
    for msg, sender_name in reversed(context_messages):
        context_lines.append(f"{sender_name}: {msg.content}")

    user_content = (
        "Recent conversation:\n"
        + "\n".join(context_lines)
        + f"\n\nSuggest 2-3 short replies to the last message: \"{last_message_content}\""
    )

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]


def _build_summary_prompt(
    messages: list[tuple[Message, str]],
    workspace_name: str,
) -> list[dict]:
    """Build messages array for conversation summary."""
    system_prompt = (
        f"You are summarising a work chat conversation from '{workspace_name}'. "
        "Write a clear, concise summary in 2-4 sentences covering the main topics discussed, "
        "decisions made, and any action items. Use professional language. "
        "Do not include greetings or pleasantries in the summary."
    )

    transcript_lines = []
    for msg, sender_name in reversed(messages):
        timestamp = msg.timestamp.strftime("%H:%M")
        transcript_lines.append(f"[{timestamp}] {sender_name}: {msg.content}")

    user_content = "Summarise this conversation:\n\n" + "\n".join(transcript_lines)

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]


async def _call_openai(messages: list[dict], max_tokens: int = 200) -> str:
    """Call OpenAI Chat Completions API."""
    try:
        from openai import AsyncOpenAI  # type: ignore
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.7,
        )
        return response.choices[0].message.content or ""
    except ImportError:
        raise AIServiceUnavailable()
    except Exception as e:
        logger.warning("OpenAI call failed", error=str(e))
        raise AIServiceUnavailable()


async def _call_anthropic(messages: list[dict], max_tokens: int = 200) -> str:
    """Call Anthropic Messages API."""
    try:
        import anthropic  # type: ignore
        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

        # Anthropic separates system from user messages
        system = next((m["content"] for m in messages if m["role"] == "system"), "")
        user_messages = [m for m in messages if m["role"] != "system"]

        response = await client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=max_tokens,
            system=system,
            messages=user_messages,
        )
        return response.content[0].text if response.content else ""
    except ImportError:
        raise AIServiceUnavailable()
    except Exception as e:
        logger.warning("Anthropic call failed", error=str(e))
        raise AIServiceUnavailable()


async def _call_ai(messages_payload: list[dict], max_tokens: int = 200) -> str:
    """Route to configured AI provider."""
    if settings.AI_PROVIDER == "anthropic":
        return await _call_anthropic(messages_payload, max_tokens)
    return await _call_openai(messages_payload, max_tokens)


async def get_smart_replies(
    slug: str,
    last_message_id: uuid.UUID,
    session: AsyncSession,
    redis=None,
) -> list[str]:
    """
    Returns 2-3 smart reply suggestions for the given message.
    Returns [] on any failure — never raises to the caller.
    """
    try:
        workspace = await get_workspace_by_slug(slug, session)
        await _check_rate_limit(workspace.id, redis)

        room = await get_room_for_workspace(workspace.id, session)

        # Get last 5 messages strictly scoped to this workspace
        context = await get_messages_for_ai_context(
            room_id=room.id,
            workspace_id=workspace.id,
            session=session,
            limit=5,
        )

        if not context:
            return []

        # Find the target message
        target_message = next(
            (msg for msg, _ in context if msg.id == last_message_id),
            context[0][0] if context else None,
        )
        if not target_message:
            return []

        prompt = _build_smart_reply_prompt(
            context_messages=context,
            last_message_content=target_message.content,
            workspace_name=workspace.name,
        )

        raw_response = await _call_ai(prompt, max_tokens=150)

        # Parse JSON array from response
        try:
            # Handle cases where model wraps in markdown code block
            raw = raw_response.strip()
            if raw.startswith("```"):
                raw = "\n".join(raw.split("\n")[1:])
                raw = raw.split("```")[0].strip()
            suggestions = json.loads(raw)
            if isinstance(suggestions, list):
                return [str(s).strip() for s in suggestions[:3] if s]
        except (json.JSONDecodeError, ValueError):
            pass

        return []

    except RateLimitExceeded:
        raise
    except AIServiceUnavailable:
        raise
    except Exception as e:
        logger.warning("Smart reply generation failed", error=str(e))
        return []


async def summarise(
    slug: str,
    last_n_messages: int,
    session: AsyncSession,
    redis=None,
) -> dict:
    """
    Returns a summary dict: { summary, message_count, from_ts, to_ts }.
    Raises AIServiceUnavailable on provider failure (user explicitly waiting).
    """
    workspace = await get_workspace_by_slug(slug, session)
    await _check_rate_limit(workspace.id, redis)

    room = await get_room_for_workspace(workspace.id, session)

    n = min(max(last_n_messages, 1), 100)
    context = await get_messages_for_ai_context(
        room_id=room.id,
        workspace_id=workspace.id,
        session=session,
        limit=n,
    )

    if not context:
        return {
            "summary": "No messages to summarise yet.",
            "message_count": 0,
            "from_ts": None,
            "to_ts": None,
        }

    prompt = _build_summary_prompt(context, workspace.name)
    summary_text = await _call_ai(prompt, max_tokens=350)

    messages_only = [msg for msg, _ in context]
    timestamps = [msg.timestamp for msg in messages_only]

    return {
        "summary": summary_text.strip(),
        "message_count": len(messages_only),
        "from_ts": min(timestamps).isoformat(),
        "to_ts": max(timestamps).isoformat(),
    }
