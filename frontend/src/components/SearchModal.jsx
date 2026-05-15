import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api.js";

const STATUS_OPTIONS = ["Active", "At Risk", "Review", "Churned"];

export default function SearchModal({ restaurant, config, onStatusChange, onClose }) {
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState("all");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [tasks, setTasks]         = useState([]);
  const [newTask, setNewTask]     = useState("");
  const [dueDate, setDueDate]     = useState("");
  const [claudeCopied, setClaudeCopied] = useState(false);
  const inputRef = useRef(null);

  // Load tasks on mount
  useEffect(() => {
    api.getTasks(restaurant.id).then(setTasks);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [restaurant.id]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearched(false);
    try {
      const data = await api.search(restaurant.id, query.trim(), sources);
      setResults(data.results || []);
    } catch (e) {
      setResults([]);
    } finally {
      setSearching(false);
      setSearched(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleAskClaude = () => {
    const lines = [
      `I'm looking at a restaurant called "${restaurant.name}" (ID: ${restaurant.id}).`,
      restaurant.slack_channel
        ? `Their Slack channel is #${restaurant.slack_channel}.`
        : "",
      query.trim()
        ? `Please search for anything related to: "${query.trim()}".`
        : "Please give me a summary of any recent issues or activity.",
      "",
      "Search the Slack channel and Intercom conversations for relevant context and give me a clear summary of what you find.",
    ].filter((l) => l !== undefined);

    const prompt = lines.join("\n");
    navigator.clipboard.writeText(prompt).catch(() => {});
    window.open("https://claude.ai", "_blank");
    setClaudeCopied(true);
    setTimeout(() => setClaudeCopied(false), 3000);
  };

  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    const task = await api.createTask(restaurant.id, newTask.trim(), dueDate || null);
    setTasks((prev) => [...prev, task]);
    setNewTask("");
    setDueDate("");
  };

  const handleToggleTask = async (taskId) => {
    const updated = await api.toggleTask(restaurant.id, taskId);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
  };

  const handleDeleteTask = async (taskId) => {
    await api.deleteTask(restaurant.id, taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleUpdateTask = async (taskId, text, due_date) => {
    const updated = await api.updateTask(restaurant.id, taskId, { text, due_date });
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
  };

  const handleStatusChange = (e) => {
    onStatusChange(restaurant.id, e.target.value);
  };

  const noIntegrations = !config.slack && !config.intercom;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">{restaurant.name}</div>
            <div className="modal-subtitle">
              {restaurant.id}
              {restaurant.slack_channel && <> · #{restaurant.slack_channel}</>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <select
              className="status-select"
              value={restaurant.status}
              onChange={handleStatusChange}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">

          {/* Search row */}
          <div>
            <div className="modal-search-row">

              <input
                ref={inputRef}
                className="modal-search-input"
                placeholder="Search Slack & Intercom… (e.g. refund, menu issue)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <div className="source-toggle">
                {[["all","All"],["slack","Slack"],["intercom","Intercom"]].map(([val, label]) => (
                  <button
                    key={val}
                    className={sources === val ? "active" : ""}
                    onClick={() => setSources(val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                className="search-btn"
                onClick={handleSearch}
                disabled={searching || !query.trim()}
              >
                {searching ? "…" : "Search"}
              </button>
            </div>

            {/* Ask Claude row */}
            <div className="ask-claude-row">
              <span className="ask-claude-label">
                ⚠️ <strong>Slack and Intercom are not connected yet.</strong><br />
              </span>
              <button className="ask-claude-btn" onClick={handleAskClaude}>
                {claudeCopied ? "✓ Prompt copied! Paste it in Claude →" : "Ask Claude instead →"}
              </button>
            </div>
          </div>

          {/* Not configured banner */}
          {/* {noIntegrations && (
            <div className="unconfigured-banner">
              ⚠️ <strong>Slack and Intercom are not connected yet.</strong><br />
            </div>
          )}
          {!noIntegrations && !config.slack && sources !== "intercom" && (
            <div className="unconfigured-banner">
              Slack is not connected. Add <code>SLACK_BOT_TOKEN</code> to enable Slack search.
            </div>
          )}
          {!noIntegrations && !config.intercom && sources !== "slack" && (
            <div className="unconfigured-banner">
              Intercom is not connected. Add <code>INTERCOM_ACCESS_TOKEN</code> to enable Intercom search.
            </div>
          )} */}

          {/* Loading */}
          {searching && (
            <div className="loading-row">
              <div className="spinner" />
              Searching…
            </div>
          )}

          {/* Results */}
          {!searching && searched && (
            <div className="results-area">
              {results.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">🔍</div>
                  <p>No results found for "<strong>{query}</strong>"</p>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: "var(--text-sec)", marginBottom: 4 }}>
                    {results.length} result{results.length !== 1 ? "s" : ""} for "<strong>{query}</strong>"
                  </div>
                  {results.map((r, i) => (
                    <ResultCard key={i} result={r} />
                  ))}
                </>
              )}
            </div>
          )}

          {/* Tasks */}
          <div className="tasks-section">
            <h4>📋 Tasks</h4>
            <div className="task-add-row">
              <input
                className="task-input"
                placeholder="Add a task…"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddTask(); }}
              />
              <input
                type="date"
                className="task-date-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                title="Due date (optional)"
              />
              <button className="task-add-btn" onClick={handleAddTask}>+ Add</button>
            </div>
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => handleToggleTask(task.id)}
                onDelete={() => handleDeleteTask(task.id)}
                onUpdate={(text, due_date) => handleUpdateTask(task.id, text, due_date)}
              />
            ))}
            {tasks.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--text-sec)", padding: "6px 2px" }}>
                No tasks yet. Add one above.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskItem({ task, onToggle, onDelete, onUpdate }) {
  const [editing, setEditing]     = useState(false);
  const [editText, setEditText]   = useState(task.text);
  const [editDate, setEditDate]   = useState(task.due_date || "");
  const [saving, setSaving]       = useState(false);

  const today   = new Date().toISOString().slice(0, 10);
  const overdue = task.due_date && !task.done && task.due_date < today;
  const dueText = task.due_date
    ? (overdue ? `⚠ Overdue: ${task.due_date}` : `Due: ${task.due_date}`)
    : null;

  const startEdit = () => {
    setEditText(task.text);
    setEditDate(task.due_date || "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      await onUpdate(editText.trim(), editDate || null);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") cancelEdit();
  };

  if (editing) {
    return (
      <div className="task-item task-item-editing">
        <div className="task-edit-row">
          <input
            className="task-edit-input"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <input
            type="date"
            className="task-date-input"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
          />
        </div>
        <div className="task-edit-actions">
          <button className="task-save-btn" onClick={saveEdit} disabled={saving || !editText.trim()}>
            {saving ? "…" : "✓ Save"}
          </button>
          <button className="task-cancel-btn" onClick={cancelEdit} disabled={saving}>
            ✕ Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`task-item${overdue ? " overdue" : ""}`}>
      <input
        type="checkbox"
        checked={task.done}
        onChange={onToggle}
        id={`task-${task.id}`}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <label htmlFor={`task-${task.id}`} className={task.done ? "done" : ""}>
          {task.text}
        </label>
        {dueText && (
          <div className={`task-due${overdue ? " task-due-overdue" : ""}`}>
            {dueText}
          </div>
        )}
      </div>
      <button className="task-edit-btn" onClick={startEdit} title="Edit task">✏</button>
      <button className="task-delete-btn" onClick={onDelete} title="Remove task">✕</button>
    </div>
  );
}

function ResultCard({ result }) {
  const isSlack = result.source === "slack";
  return (
    <div className={`result-card ${result.source}`}>
      <span className={`result-source-badge ${result.source}`}>
        {isSlack ? "Slack" : "Intercom"}
      </span>
      <div className="result-text">
        {isSlack ? result.text : result.snippet || result.subject}
      </div>
      <div className="result-meta">
        {isSlack
          ? `${result.timestamp || ""}${result.user ? ` · User: ${result.user}` : ""}${result.channel ? ` · #${result.channel}` : ""}`
          : `${result.created_at || ""}${result.contact_name ? ` · ${result.contact_name}` : ""}${result.contact_email ? ` (${result.contact_email})` : ""}`
        }
      </div>
      {!isSlack && result.url && (
        <a className="result-link" href={result.url} target="_blank" rel="noreferrer">
          Open in Intercom →
        </a>
      )}
    </div>
  );
}
