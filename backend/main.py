"""
Tarro Pizza Dashboard — FastAPI backend
Serves the React app in production and exposes /api/* endpoints.
Data is persisted in PostgreSQL (Railway-managed).
"""

import json
import os
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Optional

import psycopg2
import psycopg2.pool
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from dotenv import load_dotenv
load_dotenv()

from backend.data.restaurants import RESTAURANTS
from backend.services import slack_service, intercom_service

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="Tarro Pizza Dashboard", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Database — connection pool
# ---------------------------------------------------------------------------

DATABASE_URL = os.environ.get("DATABASE_URL", "")

_pool: psycopg2.pool.ThreadedConnectionPool = None


def get_pool():
    global _pool
    if _pool is None:
        if not DATABASE_URL:
            raise RuntimeError("DATABASE_URL is not set. Add it in Railway → Variables.")
        _pool = psycopg2.pool.ThreadedConnectionPool(1, 10, DATABASE_URL)
    return _pool


@contextmanager
def db():
    """Context manager that yields a connection and auto-commits / returns it."""
    conn = get_pool().getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        get_pool().putconn(conn)


# ---------------------------------------------------------------------------
# Bootstrap — create tables if they don't exist
# ---------------------------------------------------------------------------

def init_db():
    with db() as conn:
        with conn.cursor() as cur:
            # Key-value store for notes, statuses, order, pins, flags
            cur.execute("""
                CREATE TABLE IF NOT EXISTS kv_store (
                    key   TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            """)
            # Tasks table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS tasks (
                    id            TEXT PRIMARY KEY,
                    restaurant_id TEXT NOT NULL,
                    text          TEXT NOT NULL,
                    done          BOOLEAN DEFAULT FALSE,
                    due_date      TEXT,
                    created_at    TIMESTAMPTZ DEFAULT NOW()
                )
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS tasks_restaurant_idx ON tasks(restaurant_id)")


# Run on startup
init_db()


# ---------------------------------------------------------------------------
# KV helpers (replaces _read_json / _write_json for simple values)
# ---------------------------------------------------------------------------

def kv_get(key: str, default=None):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT value FROM kv_store WHERE key = %s", (key,))
            row = cur.fetchone()
            return json.loads(row[0]) if row else default


def kv_set(key: str, value):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO kv_store (key, value)
                VALUES (%s, %s)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
            """, (key, json.dumps(value)))


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class TaskCreate(BaseModel):
    text: str
    due_date: Optional[str] = None  # ISO date string e.g. "2026-05-20"


class NoteUpdate(BaseModel):
    content: str


class StatusUpdate(BaseModel):
    status: str


class OrderUpdate(BaseModel):
    order: list[str]


class SearchResult(BaseModel):
    source: str
    text: Optional[str] = None
    snippet: Optional[str] = None
    subject: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    channel: Optional[str] = None
    user: Optional[str] = None
    timestamp: Optional[str] = None
    created_at: Optional[str] = None
    url: Optional[str] = None
    conversation_id: Optional[str] = None


# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------

@app.get("/api/restaurants")
def get_restaurants():
    """Return all restaurants with their current status overrides."""
    statuses = kv_get("statuses", {})
    result = []
    for r in RESTAURANTS:
        entry = dict(r)
        if r["id"] in statuses:
            entry["status"] = statuses[r["id"]]
        result.append(entry)
    return result


@app.get("/api/config")
async def get_config():
    """Return which integrations are configured."""
    return {
        "slack": await slack_service.is_configured(),
        "intercom": await intercom_service.is_configured(),
    }


# --- Search ---

@app.get("/api/search/{rid}")
async def search(
    rid: str,
    q: str = Query(..., min_length=1),
    sources: str = Query("all"),
):
    restaurant = next((r for r in RESTAURANTS if r["id"] == rid), None)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    results = []
    if sources in ("all", "slack") and restaurant.get("slack_channel"):
        results.extend(await slack_service.search_slack(restaurant["slack_channel"], q))
    if sources in ("all", "intercom"):
        results.extend(await intercom_service.search_intercom(restaurant["name"], q))

    return {"query": q, "restaurant": restaurant["name"], "results": results}


# --- Tasks ---

def _row_to_task(row) -> dict:
    return {
        "id":            row[0],
        "restaurant_id": row[1],
        "text":          row[2],
        "done":          row[3],
        "due_date":      row[4],
    }


@app.get("/api/tasks")
def get_all_tasks():
    """Return all tasks keyed by restaurant_id."""
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, restaurant_id, text, done, due_date "
                "FROM tasks ORDER BY created_at ASC"
            )
            rows = cur.fetchall()
    result: dict[str, list] = {}
    for row in rows:
        t = _row_to_task(row)
        result.setdefault(t["restaurant_id"], []).append(t)
    return result


@app.get("/api/tasks/{rid}")
def get_tasks(rid: str):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, restaurant_id, text, done, due_date "
                "FROM tasks WHERE restaurant_id = %s ORDER BY created_at ASC",
                (rid,)
            )
            rows = cur.fetchall()
    return [_row_to_task(r) for r in rows]


@app.post("/api/tasks/{rid}")
def create_task(rid: str, body: TaskCreate):
    task_id = str(uuid.uuid4())
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO tasks (id, restaurant_id, text, done, due_date) "
                "VALUES (%s, %s, %s, FALSE, %s)",
                (task_id, rid, body.text, body.due_date)
            )
    return {"id": task_id, "restaurant_id": rid, "text": body.text,
            "done": False, "due_date": body.due_date}


@app.patch("/api/tasks/{rid}/{task_id}")
def toggle_task(rid: str, task_id: str):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE tasks SET done = NOT done "
                "WHERE id = %s AND restaurant_id = %s "
                "RETURNING id, restaurant_id, text, done, due_date",
                (task_id, rid)
            )
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    return _row_to_task(row)


@app.delete("/api/tasks/{rid}/{task_id}")
def delete_task(rid: str, task_id: str):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM tasks WHERE id = %s AND restaurant_id = %s",
                (task_id, rid)
            )
    return {"ok": True}


# --- Notes ---

@app.get("/api/notes")
def get_notes():
    return {"content": kv_get("notes", "")}


@app.post("/api/notes")
def save_notes(body: NoteUpdate):
    kv_set("notes", body.content)
    return {"ok": True}


# --- Status overrides ---

@app.post("/api/status/{rid}")
def update_status(rid: str, body: StatusUpdate):
    statuses = kv_get("statuses", {})
    statuses[rid] = body.status
    kv_set("statuses", statuses)
    return {"ok": True}


# --- Card order ---

@app.get("/api/order")
def get_order():
    return kv_get("order", [])


@app.post("/api/order")
def save_order(body: OrderUpdate):
    kv_set("order", body.order)
    return {"ok": True}


# --- Pins ---

@app.get("/api/pins")
def get_pins():
    return kv_get("pins", [])


@app.post("/api/pins")
def save_pins(body: dict):
    kv_set("pins", body.get("pins", []))
    return {"ok": True}


# --- Flags ---

@app.get("/api/flags")
def get_flags():
    return kv_get("flags", [])


@app.post("/api/flags")
def save_flags(body: dict):
    kv_set("flags", body.get("flags", []))
    return {"ok": True}


# ---------------------------------------------------------------------------
# Serve React frontend (production)
# ---------------------------------------------------------------------------

FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        return FileResponse(str(FRONTEND_DIST / "index.html"))
