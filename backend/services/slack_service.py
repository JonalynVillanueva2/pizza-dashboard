"""
Slack service — fetches channel messages and filters by keyword.

Uses conversations.history (bot token compatible).
Channel IDs are resolved once and cached in memory for the session.
"""

import os
import time
import httpx
from typing import Optional

SLACK_TOKEN = os.getenv("SLACK_BOT_TOKEN", "")
BASE_URL = "https://slack.com/api"

# In-memory cache: channel_name -> channel_id
_channel_id_cache: dict[str, str] = {}
# Message cache: channel_id -> (timestamp, messages)
_message_cache: dict[str, tuple[float, list]] = {}
CACHE_TTL = 300  # 5 minutes


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {SLACK_TOKEN}",
        "Content-Type": "application/json",
    }


async def is_configured() -> bool:
    return bool(SLACK_TOKEN and SLACK_TOKEN != "xoxb-your-token-here")


async def resolve_channel_id(channel_name: str) -> Optional[str]:
    """Look up the Slack channel ID for a given channel name."""
    if channel_name in _channel_id_cache:
        return _channel_id_cache[channel_name]

    cursor = None
    async with httpx.AsyncClient(timeout=10) as client:
        while True:
            params = {"limit": 200, "types": "public_channel,private_channel"}
            if cursor:
                params["cursor"] = cursor

            resp = await client.get(
                f"{BASE_URL}/conversations.list",
                headers=_headers(),
                params=params,
            )
            data = resp.json()

            if not data.get("ok"):
                return None

            for ch in data.get("channels", []):
                _channel_id_cache[ch["name"]] = ch["id"]

            meta = data.get("response_metadata", {})
            cursor = meta.get("next_cursor")
            if not cursor:
                break

    return _channel_id_cache.get(channel_name)


async def fetch_messages(channel_id: str, limit: int = 200) -> list[dict]:
    """Fetch recent messages from a channel, with 5-minute cache."""
    now = time.time()
    if channel_id in _message_cache:
        ts, msgs = _message_cache[channel_id]
        if now - ts < CACHE_TTL:
            return msgs

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{BASE_URL}/conversations.history",
            headers=_headers(),
            params={"channel": channel_id, "limit": limit},
        )
        data = resp.json()

    if not data.get("ok"):
        return []

    messages = data.get("messages", [])
    _message_cache[channel_id] = (now, messages)
    return messages


async def search_slack(channel_name: str, keyword: str) -> list[dict]:
    """
    Search messages in a Slack channel for the given keyword.
    Returns a list of result dicts with text, user, ts, permalink.
    """
    if not await is_configured():
        return []

    channel_id = await resolve_channel_id(channel_name)
    if not channel_id:
        return []

    messages = await fetch_messages(channel_id)
    kw = keyword.lower()
    results = []

    for msg in messages:
        text = msg.get("text", "")
        if kw in text.lower():
            results.append({
                "source": "slack",
                "channel": channel_name,
                "text": text,
                "user": msg.get("user", ""),
                "ts": msg.get("ts", ""),
                "timestamp": _ts_to_iso(msg.get("ts", "")),
            })

    return results


def _ts_to_iso(ts: str) -> str:
    """Convert Slack timestamp (epoch.microseconds) to ISO string."""
    try:
        epoch = float(ts)
        import datetime
        dt = datetime.datetime.utcfromtimestamp(epoch)
        return dt.strftime("%Y-%m-%d %H:%M UTC")
    except Exception:
        return ts
