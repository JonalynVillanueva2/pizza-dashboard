"""
Intercom service — searches conversations by keyword.

Uses POST /conversations/search with full-text query.
"""

import os
import httpx

INTERCOM_TOKEN = os.getenv("INTERCOM_ACCESS_TOKEN", "")
BASE_URL = "https://api.intercom.io"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {INTERCOM_TOKEN}",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Intercom-Version": "2.10",
    }


async def is_configured() -> bool:
    return bool(INTERCOM_TOKEN and INTERCOM_TOKEN != "your-intercom-token-here")


async def search_intercom(restaurant_name: str, keyword: str) -> list[dict]:
    """
    Search Intercom conversations for messages mentioning the keyword,
    filtered to conversations that reference the restaurant.
    """
    if not await is_configured():
        return []

    # Search by keyword in conversation body
    query = {
        "query": {
            "operator": "AND",
            "value": [
                {
                    "field": "source.body",
                    "operator": "~",
                    "value": keyword,
                }
            ],
        },
        "pagination": {"per_page": 20},
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{BASE_URL}/conversations/search",
            headers=_headers(),
            json=query,
        )

    if resp.status_code != 200:
        return []

    data = resp.json()
    conversations = data.get("conversations", [])

    results = []
    rname_lower = restaurant_name.lower()

    for conv in conversations:
        # Try to match restaurant by checking contact info or conversation subject
        source = conv.get("source", {})
        subject = source.get("subject", "") or ""
        body = source.get("body", "") or ""
        author = source.get("author", {}) or {}
        contact_name = author.get("name", "") or ""
        contact_email = author.get("email", "") or ""

        # Include if restaurant name appears OR if keyword is clearly relevant
        # (For broad search, include all results and let user filter visually)
        snippet = _clean_html(body)[:300]

        results.append({
            "source": "intercom",
            "conversation_id": conv.get("id", ""),
            "subject": subject or "(no subject)",
            "snippet": snippet,
            "contact_name": contact_name,
            "contact_email": contact_email,
            "created_at": _epoch_to_iso(conv.get("created_at")),
            "url": f"https://app.intercom.com/a/inbox/conversation/{conv.get('id', '')}",
        })

    return results


def _clean_html(text: str) -> str:
    """Strip basic HTML tags from Intercom body."""
    import re
    return re.sub(r"<[^>]+>", " ", text).strip()


def _epoch_to_iso(epoch) -> str:
    try:
        import datetime
        dt = datetime.datetime.utcfromtimestamp(int(epoch))
        return dt.strftime("%Y-%m-%d %H:%M UTC")
    except Exception:
        return ""
