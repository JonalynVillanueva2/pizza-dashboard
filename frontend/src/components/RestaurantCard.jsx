import { useState, useEffect } from "react";
import { api } from "../api.js";

const STATUS_OPTIONS = ["Active", "At Risk", "Review", "Churned"];

// Exact badge class names matching the original HTML dashboard
const BADGE_CLASS = {
  "Active":  "badge-Active",
  "At Risk": "badge-At-Risk",
  "Churned": "badge-Churned",
  "Review":  "badge-Review",
};

export default function RestaurantCard({
  restaurant,
  pinned, flagged, compact,
  onSelect, onStatusChange,
  onTogglePin, onToggleFlag,
  isDragging, isDragOver,
  onDragStart, onDragOver, onDrop, onDragEnd,
}) {
  const [tasks, setTasks]                   = useState([]);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  useEffect(() => {
    api.getTasks(restaurant.id).then(setTasks);
  }, [restaurant.id]);

  const doneCount  = tasks.filter((t) => t.done).length;
  const totalCount = tasks.length;
  const progress   = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
  const hasSop     = !!restaurant.sop;
  const badgeCls   = BADGE_CLASS[restaurant.status] || "badge-Active";

  const stopAndRun = (e, fn) => { e.stopPropagation(); fn(); };

  // ── Compact / list mode ──────────────────────────────────────────
  if (compact) {
    return (
      <div
        className={[
          "resto-card compact-card",
          restaurant.status === "Churned" ? "churned" : "",
          isDragging ? "is-dragging"  : "",
          isDragOver ? "is-drag-over" : "",
          pinned     ? "is-pinned"    : "",
          flagged    ? "is-flagged"   : "",
        ].filter(Boolean).join(" ")}
        draggable
        onDragStart={onDragStart} onDragOver={onDragOver}
        onDrop={onDrop} onDragEnd={onDragEnd}
        onClick={() => onSelect(restaurant)}
      >
        <span className="drag-handle compact-handle" onClick={(e) => e.stopPropagation()}>⠿</span>
        <button className={`icon-btn pin-btn${pinned ? " on" : ""}`}
          onClick={(e) => stopAndRun(e, () => onTogglePin(restaurant.id))} title={pinned ? "Unpin" : "Pin"}>★</button>
        <button className={`icon-btn flag-btn${flagged ? " on" : ""}`}
          onClick={(e) => stopAndRun(e, () => onToggleFlag(restaurant.id))} title="Flag urgent">🚨</button>

        <span className="compact-name">{restaurant.name}</span>
        <span className="compact-id">{restaurant.id}</span>

        <div style={{ position: "relative", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <button className={`status-badge ${badgeCls}`} onClick={() => setShowStatusMenu((v) => !v)}>
            {restaurant.status}
          </button>
          {showStatusMenu && (
            <StatusMenu current={restaurant.status}
              onSelect={(s) => { onStatusChange(restaurant.id, s); setShowStatusMenu(false); }} />
          )}
        </div>

        <span className="compact-tasks">{doneCount}/{totalCount} tasks</span>

        {hasSop ? (
          <a href={restaurant.sop} target="_blank" rel="noreferrer"
            className="btn-sop compact-sop" onClick={(e) => e.stopPropagation()}>📄 SOP</a>
        ) : (
          <button className="btn-sop no-link compact-sop" disabled onClick={(e) => e.stopPropagation()}>📄 No SOP</button>
        )}

        <button className="compact-open-btn" onClick={(e) => stopAndRun(e, () => onSelect(restaurant))}>
          Open →
        </button>
      </div>
    );
  }

  // ── Grid / card mode ─────────────────────────────────────────────
  return (
    <div
      className={[
        "resto-card",
        restaurant.status === "Churned" ? "churned" : "",
        isDragging ? "is-dragging"  : "",
        isDragOver ? "is-drag-over" : "",
        pinned     ? "is-pinned"    : "",
        flagged    ? "is-flagged"   : "",
      ].filter(Boolean).join(" ")}
      draggable
      onDragStart={onDragStart} onDragOver={onDragOver}
      onDrop={onDrop} onDragEnd={onDragEnd}
      onClick={() => onSelect(restaurant)}
    >
      {/* Drag handle */}
      <div className="drag-handle" onClick={(e) => e.stopPropagation()} title="Drag to reorder">⠿</div>

      {/* Pinned stripe */}
      {pinned && <div className="pinned-stripe" />}

      {/* ── Card Header ── */}
      <div className="card-header">
        <div className="card-header-left">
          <div className="resto-name">
            {flagged && <span className="flag-dot">🚨 </span>}
            {restaurant.name}
          </div>
          <div className="resto-id">{restaurant.id}</div>
        </div>
        <div className="status-wrap" onClick={(e) => e.stopPropagation()}>
          <button className={`status-badge ${badgeCls}`} onClick={() => setShowStatusMenu((v) => !v)}>
            {restaurant.status}
          </button>
          {showStatusMenu && (
            <StatusMenu current={restaurant.status}
              onSelect={(s) => { onStatusChange(restaurant.id, s); setShowStatusMenu(false); }} />
          )}
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="card-progress">
        <div className="progress-label">
          <span>Tasks</span>
          <span>{doneCount}/{totalCount}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="card-actions">
        {hasSop ? (
          <a href={restaurant.sop} target="_blank" rel="noreferrer"
            className="btn-sop" onClick={(e) => e.stopPropagation()}>
            📄 View SOP
          </a>
        ) : (
          <button className="btn-sop no-link" disabled onClick={(e) => e.stopPropagation()}>
            📄 No SOP Link
          </button>
        )}

        <button className="btn-tasks" onClick={(e) => stopAndRun(e, () => onSelect(restaurant))}>
          📋 Tasks <span className="task-count-badge">{totalCount}</span>
        </button>

        {/* Pin & flag */}
        <button className={`icon-btn pin-btn${pinned ? " on" : ""}`}
          onClick={(e) => stopAndRun(e, () => onTogglePin(restaurant.id))} title={pinned ? "Unpin" : "Pin"}>★</button>
        <button className={`icon-btn flag-btn${flagged ? " on" : ""}`}
          onClick={(e) => stopAndRun(e, () => onToggleFlag(restaurant.id))} title="Flag urgent">🚨</button>
      </div>
    </div>
  );
}

function StatusMenu({ current, onSelect }) {
  const STATUS_COLORS = {
    "Active":  "#7326D3",
    "At Risk": "#E65100",
    "Churned": "#C62828",
    "Review":  "#00695C",
  };
  return (
    <div className="status-dropdown open">
      {STATUS_OPTIONS.map((s) => (
        <div key={s} className="status-opt" onClick={() => onSelect(s)}>
          <span className="opt-dot" style={{ background: STATUS_COLORS[s] || "#999" }} />
          {s}
        </div>
      ))}
    </div>
  );
}
