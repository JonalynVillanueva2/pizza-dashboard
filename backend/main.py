"""
Tarro Pizza Dashboard — FastAPI backend
Serves the React app in production and exposes /api/* endpoints.
"""

import json
import os
from pathlib import Path
from typing import Optional

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

app = FastAPI(title="Tarro Pizza Dashboard", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# JSON file persistence helpers
# ---------------------------------------------------------------------------

DATA_DIR = Path(__file__).parent / "data"
TASKS_FILE = DATA_DIR / "tasks.json"
NOTES_FILE = DATA_DIR / "notes.json"
STATUS_FILE = DATA_DIR / "statuses.json"


def _read_json(path: Path, default):
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            pass
    return default


def _write_json(path: Path, data):
    path.write_text(json.dumps(data, indent=2))


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class Task(BaseModel):
    id: str
    text: str
    done: bool = False


class TaskCreate(BaseModel):
    text: str


class NoteUpdate(BaseModel):
    content: str


class StatusUpdate(BaseModel):
    status: str


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
    statuses = _read_json(STATUS_FILE, {})
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
    sources: str = Query("all"),  # "slack", "intercom", or "all"
):
    """Search Slack and/or Intercom for keyword within a restaurant's context."""
    restaurant = next((r for r in RESTAURANTS if r["id"] == rid), None)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    results = []
    use_slack = sources in ("all", "slack")
    use_intercom = sources in ("all", "intercom")

    if use_slack and restaurant.get("slack_channel"):
        slack_results = await slack_service.search_slack(
            restaurant["slack_channel"], q
        )
        results.extend(slack_results)

    if use_intercom:
        intercom_results = await intercom_service.search_intercom(
            restaurant["name"], q
        )
        results.extend(intercom_results)

    return {"query": q, "restaurant": restaurant["name"], "results": results}


# --- Tasks ---

@app.get("/api/tasks/{rid}")
def get_tasks(rid: str):
    tasks = _read_json(TASKS_FILE, {})
    return tasks.get(rid, [])


@app.post("/api/tasks/{rid}")
def create_task(rid: str, body: TaskCreate):
    import uuid
    tasks = _read_json(TASKS_FILE, {})
    if rid not in tasks:
        tasks[rid] = []
    new_task = {"id": str(uuid.uuid4()), "text": body.text, "done": False}
    tasks[rid].append(new_task)
    _write_json(TASKS_FILE, tasks)
    return new_task


@app.patch("/api/tasks/{rid}/{task_id}")
def toggle_task(rid: str, task_id: str):
    tasks = _read_json(TASKS_FILE, {})
    for task in tasks.get(rid, []):
        if task["id"] == task_id:
            task["done"] = not task["done"]
            _write_json(TASKS_FILE, tasks)
            return task
    raise HTTPException(status_code=404, detail="Task not found")


@app.delete("/api/tasks/{rid}/{task_id}")
def delete_task(rid: str, task_id: str):
    tasks = _read_json(TASKS_FILE, {})
    original = tasks.get(rid, [])
    tasks[rid] = [t for t in original if t["id"] != task_id]
    _write_json(TASKS_FILE, tasks)
    return {"ok": True}


# --- Notes ---

@app.get("/api/notes")
def get_notes():
    return _read_json(NOTES_FILE, {"content": ""})


@app.post("/api/notes")
def save_notes(body: NoteUpdate):
    _write_json(NOTES_FILE, {"content": body.content})
    return {"ok": True}


# --- Status overrides ---

@app.post("/api/status/{rid}")
def update_status(rid: str, body: StatusUpdate):
    statuses = _read_json(STATUS_FILE, {})
    statuses[rid] = body.status
    _write_json(STATUS_FILE, statuses)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Serve React frontend (production)
# ---------------------------------------------------------------------------

FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        index = FRONTEND_DIST / "index.html"
        return FileResponse(str(index))
