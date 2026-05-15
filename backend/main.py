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
# Bootstrap — create tables and seed restaurants
# ---------------------------------------------------------------------------

def init_db():
    with db() as conn:
        with conn.cursor() as cur:
            # Restaurants table (source of truth)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS restaurants (
                    id            TEXT PRIMARY KEY,
                    name          TEXT NOT NULL,
                    status        TEXT NOT NULL DEFAULT 'Active',
                    slack_channel TEXT,
                    sop           TEXT,
                    created_at    TIMESTAMPTZ DEFAULT NOW()
                )
            """)

            # Key-value store for notes, order, pins, flags
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
            cur.execute(
                "CREATE INDEX IF NOT EXISTS tasks_restaurant_idx ON tasks(restaurant_id)"
            )

            # Seed restaurants only if table is empty
            cur.execute("SELECT COUNT(*) FROM restaurants")
            if cur.fetchone()[0] == 0:
                for r in RESTAURANTS:
                    cur.execute("""
                        INSERT INTO restaurants (id, name, status, slack_channel, sop)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING
                    """, (
                        r["id"],
                        r["name"],
                        r.get("status", "Active"),
                        r.get("slack_channel") or None,
                        r.get("sop") or None,
                    ))


init_db()


# ---------------------------------------------------------------------------
# KV helpers
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

class RestaurantCreate(BaseModel):
    id: str          # RID e.g. "R99999"
    name: str
    status: str = "Active"
    slack_channel: Optional[str] = None
    sop: Optional[str] = None


class RestaurantUpdate(BaseModel):
    name: str
    status: str
    slack_channel: Optional[str] = None
    sop: Optional[str] = None


class TaskCreate(BaseModel):
    text: str
    due_date: Optional[str] = None


class TaskUpdate(BaseModel):
    text: str
    due_date: Optional[str] = None


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
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, status, slack_channel, sop "
                "FROM restaurants ORDER BY created_at ASC"
            )
            rows = cur.fetchall()
    return [
        {"id": r[0], "name": r[1], "status": r[2],
         "slack_channel": r[3] or "", "sop": r[4] or ""}
        for r in rows
    ]


@app.post("/api/restaurants")
def create_restaurant(body: RestaurantCreate):
    """Add a new restaurant."""
    with db() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute("""
                    INSERT INTO restaurants (id, name, status, slack_channel, sop)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    body.id.strip(),
                    body.name.strip(),
                    body.status,
                    body.slack_channel.strip() if body.slack_channel else None,
                    body.sop.strip() if body.sop else None,
                ))
            except psycopg2.errors.UniqueViolation:
                raise HTTPException(
                    status_code=409,
                    detail=f"Restaurant ID '{body.id}' already exists."
                )
    return {"id": body.id, "name": body.name, "status": body.status,
            "slack_channel": body.slack_channel or "",
            "sop": body.sop or ""}


@app.put("/api/restaurants/{rid}")
def update_restaurant(rid: str, body: RestaurantUpdate):
    """Edit an existing restaurant's details (name, status, slack, sop)."""
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE restaurants
                SET name = %s, status = %s, slack_channel = %s, sop = %s
                WHERE id = %s
            """, (
                body.name.strip(),
                body.status,
                body.slack_channel.strip() if body.slack_channel else None,
                body.sop.strip() if body.sop else None,
                rid,
            ))
    return {"ok": True}


@app.delete("/api/restaurants/{rid}")
def delete_restaurant(rid: str):
    """Delete a restaurant and all its tasks."""
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM tasks WHERE restaurant_id = %s", (rid,))
            cur.execute("DELETE FROM restaurants WHERE id = %s", (rid,))
    # Also remove from order, pins, flags in kv_store
    for key in ("order", "pins", "flags"):
        data = kv_get(key, [] if key != "order" else [])
        kv_set(key, [x for x in data if x != rid])
    return {"ok": True}


@app.get("/api/config")
async def get_config():
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
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, slack_channel FROM restaurants WHERE id = %s", (rid,)
            )
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    restaurant = {"id": row[0], "name": row[1], "slack_channel": row[2]}

    results = []
    if sources in ("all", "slack") and restaurant.get("slack_channel"):
        results.extend(await slack_service.search_slack(restaurant["slack_channel"], q))
    if sources in ("all", "intercom"):
        results.extend(await intercom_service.search_intercom(restaurant["name"], q))
    return {"query": q, "restaurant": restaurant["name"], "results": results}


# --- Tasks ---

def _row_to_task(row) -> dict:
    return {"id": row[0], "restaurant_id": row[1], "text": row[2],
            "done": row[3], "due_date": row[4]}


@app.get("/api/tasks")
def get_all_tasks():
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


@app.put("/api/tasks/{rid}/{task_id}")
def update_task(rid: str, task_id: str, body: TaskUpdate):
    """Edit a task's text and/or due date."""
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE tasks SET text = %s, due_date = %s
                WHERE id = %s AND restaurant_id = %s
                RETURNING id, restaurant_id, text, done, due_date
            """, (body.text.strip(), body.due_date or None, task_id, rid))
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
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE restaurants SET status = %s WHERE id = %s",
                (body.status, rid)
            )
    return {"ok": True}


# --- Card order ---

@app.get("/api/order")
def get_order():
    return kv_get("order", [])


@app.post("/api/order")
def save_order(body: OrderUpdate):
    kv_set("order", body.order)
    return {"ok": True}


@app.post("/api/order/reset")
def reset_order():
    """Reset card order to match the sequence defined in restaurants.py."""
    order = [r["id"] for r in RESTAURANTS]
    kv_set("order", order)
    return order


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
