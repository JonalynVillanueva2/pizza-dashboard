import { useState } from "react";

const today = new Date().toISOString().slice(0, 10);

export default function TaskSummaryPanel({ allTasks, restaurants, onSelectRestaurant }) {
  const [open, setOpen]         = useState(true);
  const [expanded, setExpanded] = useState(new Set());

  const toggleExpand = (rid, e) => {
    e.stopPropagation();
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(rid)) next.delete(rid);
      else next.add(rid);
      return next;
    });
  };

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

  const sorted = [...summary].sort((a, b) => b.pending - a.pending);

  if (grandTotal === 0) return null;

  return (
    <div className="task-summary-panel">
      {/* Header */}
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

      {/* Body */}
      {open && (
        <div className="ts-body">
          {sorted.map(({ restaurant, total, done, pending, tasks }) => {
            const rpct       = Math.round((done / total) * 100);
            const isExpanded = expanded.has(restaurant.id);
            return (
              <div key={restaurant.id} className="ts-resto-group">

                {/* Restaurant row */}
                <div className="ts-row">
                  <div className="ts-row-left">
                    <button
                      className="ts-expand-btn"
                      onClick={(e) => toggleExpand(restaurant.id, e)}
                      title={isExpanded ? "Collapse" : "Show tasks"}
                    >
                      {isExpanded ? "▼" : "▶"}
                    </button>
                    <span className={`ts-dot${pending === 0 ? " done" : ""}`} />
                    <button
                      className="ts-resto-name"
                      onClick={() => onSelectRestaurant(restaurant)}
                    >
                      {restaurant.name}
                    </button>
                  </div>
                  <div className="ts-row-right">
                    <div className="ts-bar">
                      <div className="ts-bar-fill" style={{ width: `${rpct}%` }} />
                    </div>
                    <span className="ts-count">
                      {done}/{total}
                      {pending > 0 && (
                        <span className="ts-pending-inline"> · {pending} left</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Task items — shown when expanded */}
                {isExpanded && (
                  <div className="ts-tasks-list">
                    {tasks.map((task) => {
                      const overdue = task.due_date && !task.done && task.due_date < today;
                      return (
                        <div
                          key={task.id}
                          className={[
                            "ts-task-item",
                            task.done ? "ts-task-done"    : "",
                            overdue   ? "ts-task-overdue" : "",
                          ].filter(Boolean).join(" ")}
                        >
                          <span className="ts-task-check">{task.done ? "☑" : "☐"}</span>
                          <span className="ts-task-text">{task.text}</span>
                          {task.due_date && (
                            <span className={`ts-task-due${overdue ? " overdue" : ""}`}>
                              {overdue ? `⚠ ${task.due_date}` : task.due_date}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
