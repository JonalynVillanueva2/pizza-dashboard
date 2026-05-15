import { useState } from "react";

export default function TaskSummaryPanel({ allTasks, restaurants, onSelectRestaurant }) {
  const [open, setOpen] = useState(true);

  // Build per-restaurant task summary
  const summary = restaurants
    .map((r) => {
      const tasks  = allTasks[r.id] || [];
      const total  = tasks.length;
      const done   = tasks.filter((t) => t.done).length;
      const pending = tasks.filter((t) => !t.done);
      return { restaurant: r, total, done, pending: pending.length, tasks };
    })
    .filter((s) => s.total > 0); // only restos that have tasks

  const grandTotal = summary.reduce((acc, s) => acc + s.total, 0);
  const grandDone  = summary.reduce((acc, s) => acc + s.done,  0);
  const pct        = grandTotal > 0 ? Math.round((grandDone / grandTotal) * 100) : 0;
  const pendingCount = grandTotal - grandDone;

  // Sort: most pending tasks first
  const sorted = [...summary].sort((a, b) => b.pending - a.pending);

  if (grandTotal === 0) return null; // nothing to show yet

  return (
    <div className="task-summary-panel">
      {/* Header — always visible */}
      <div className="ts-header" onClick={() => setOpen((v) => !v)}>
        <div className="ts-header-left">
          <span className="ts-icon">📋</span>
          <span className="ts-title">Task Summary</span>
          {pendingCount > 0 && (
            <span className="ts-pending-badge">{pendingCount} pending</span>
          )}
          {pendingCount === 0 && (
            <span className="ts-all-done-badge">✓ All done!</span>
          )}
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

      {/* Body — collapsible */}
      {open && (
        <div className="ts-body">
          {sorted.map(({ restaurant, total, done, pending }) => {
            const rpct = Math.round((done / total) * 100);
            return (
              <div key={restaurant.id} className="ts-row">
                <div className="ts-row-left">
                  <span className={`ts-dot ${pending === 0 ? "done" : ""}`} />
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
            );
          })}
        </div>
      )}
    </div>
  );
}
