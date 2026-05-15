import { useState } from "react";

const today = new Date().toISOString().slice(0, 10);

export default function TaskSummaryPanel({
  allTasks, restaurants, onSelectRestaurant, onToggleTask, onBulkDeleteTasks,
}) {
  const [open, setOpen]           = useState(true);
  const [selected, setSelected]   = useState(new Set());
  const [confirming, setConfirming] = useState(false);

  const summary = restaurants
    .map((r) => {
      const tasks = allTasks[r.id] || [];
      const total = tasks.length;
      const done  = tasks.filter((t) => t.done).length;
      return { restaurant: r, total, done, pending: total - done, tasks };
    })
    .filter((s) => s.total > 0);

  const grandTotal   = summary.reduce((a, s) => a + s.total, 0);
  const grandDone    = summary.reduce((a, s) => a + s.done,  0);
  const pct          = grandTotal > 0 ? Math.round((grandDone / grandTotal) * 100) : 0;
  const pendingCount = grandTotal - grandDone;

  const sorted      = [...summary].sort((a, b) => b.pending - a.pending);
  const allSelected = selected.size === sorted.length && sorted.length > 0;
  const someSelected = selected.size > 0;

  const toggleSelect = (rid) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rid)) next.delete(rid);
      else next.add(rid);
      return next;
    });
    setConfirming(false);
  };

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(sorted.map((s) => s.restaurant.id)));
    setConfirming(false);
  };

  const handleDeleteConfirmed = async () => {
    await onBulkDeleteTasks([...selected]);
    setSelected(new Set());
    setConfirming(false);
  };

  if (grandTotal === 0) return null;

  return (
    <div className="task-summary-panel">

      {/* ── Header ── */}
      <div className="ts-header" onClick={() => setOpen((v) => !v)}>
        <div className="ts-header-left">
          <span className="ts-icon">📋</span>
          <span className="ts-title">Task Summary</span>
          {pendingCount > 0
            ? <span className="ts-pending-badge">{pendingCount} pending</span>
            : <span className="ts-all-done-badge">✓ All done!</span>}
        </div>
        <div className="ts-header-right">
          <span className="ts-overall">{grandDone}/{grandTotal} done</span>
          <div className="ts-mini-bar">
            <div className="ts-mini-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="ts-pct">{pct}%</span>
          <span className="ts-chevron">{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* ── Selection action bar ── */}
      {open && someSelected && (
        <div className="ts-action-bar" onClick={(e) => e.stopPropagation()}>
          <span className="ts-action-label">
            {selected.size} restaurant{selected.size !== 1 ? "s" : ""} selected
          </span>
          {!confirming ? (
            <button className="ts-delete-btn" onClick={() => setConfirming(true)}>
              🗑 Delete Tasks
            </button>
          ) : (
            <div className="ts-confirm-row">
              <span className="ts-confirm-text">
                Delete all tasks for {selected.size} restaurant{selected.size !== 1 ? "s" : ""}?
              </span>
              <button className="ts-confirm-yes" onClick={handleDeleteConfirmed}>Yes, Delete</button>
              <button className="ts-confirm-no"  onClick={() => setConfirming(false)}>Cancel</button>
            </div>
          )}
        </div>
      )}

      {/* ── Table ── */}
      {open && (
        <div className="ts-table-wrap">
          {/* Column headers */}
          <div className="ts-table-head">
            <div className="ts-col-resto-head">
              <input
                type="checkbox"
                className="ts-sel-checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                title={allSelected ? "Deselect all" : "Select all"}
              />
              Restaurant
            </div>
            <div className="ts-col-tasks-head">Tasks</div>
          </div>

          {/* Rows */}
          {sorted.map(({ restaurant, total, done, pending, tasks }) => {
            const rpct       = Math.round((done / total) * 100);
            const isSelected = selected.has(restaurant.id);
            return (
              <div
                key={restaurant.id}
                className={`ts-table-row${isSelected ? " ts-row-selected" : ""}`}
              >
                {/* Left: restaurant */}
                <div className="ts-col-resto">
                  <div className="ts-resto-info">
                    <input
                      type="checkbox"
                      className="ts-sel-checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(restaurant.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className={`ts-dot${pending === 0 ? " done" : ""}`} />
                    <button
                      className="ts-resto-name"
                      onClick={() => onSelectRestaurant(restaurant)}
                      title="Open restaurant"
                    >
                      {restaurant.name}
                    </button>
                  </div>
                  <div className="ts-resto-progress">
                    <div className="ts-bar">
                      <div className="ts-bar-fill" style={{ width: `${rpct}%` }} />
                    </div>
                    <span className="ts-count">
                      {done}/{total}
                      {pending > 0 && <span className="ts-pending-inline"> · {pending} left</span>}
                    </span>
                  </div>
                </div>

                {/* Right: tasks */}
                <div className="ts-col-tasks">
                  {tasks.map((task) => {
                    const overdue = task.due_date && !task.done && task.due_date < today;
                    return (
                      <label
                        key={task.id}
                        className={[
                          "ts-task-row",
                          task.done ? "ts-task-row--done"    : "",
                          overdue   ? "ts-task-row--overdue" : "",
                        ].filter(Boolean).join(" ")}
                      >
                        <input
                          type="checkbox"
                          className="ts-checkbox"
                          checked={task.done}
                          onChange={() => onToggleTask(restaurant.id, task.id)}
                        />
                        <span className="ts-task-label">{task.text}</span>
                        {task.due_date && (
                          <span className={`ts-task-due-tag${overdue ? " overdue" : ""}`}>
                            {overdue ? `⚠ ${task.due_date}` : task.due_date}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
