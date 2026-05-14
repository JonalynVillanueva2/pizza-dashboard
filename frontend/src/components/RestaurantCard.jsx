import { useState, useEffect } from "react";
import { api } from "../api.js";

const STATUS_OPTIONS = ["Active", "At Risk", "Review", "Churned"];
const STATUS_CLASS   = { "Active": "Active", "At Risk": "AtRisk", "Churned": "Churned", "Review": "Review" };

export default function RestaurantCard({
  restaurant,
  pinned, flagged, compact,
  onSelect, onStatusChange,
  onTogglePin, onToggleFlag,
  isDragging, isDragOver,
  onDragStart, onDragOver, onDrop, onDragEnd,
}) {
  const [taskCount, setTaskCount]       = useState(0);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  useEffect(() => {
    api.getTasks(restaurant.id).then((t) => setTaskCount(t.length));
  }, [restaurant.id]);

  const stopAndRun = (e, fn) => { e.stopPropagation(); fn(); };
  const cls = STATUS_CLASS[restaurant.status] || "Active";

  // ── Compact / list mode ──────────────────────────────────────────
  if (compact) {
    return (
      <div
        className={[
          "resto-card compact-card",
          restaurant.status === "Churned" ? "churned" : "",
          isDragging  ? "is-dragging"  : "",
          isDragOver  ? "is-drag-over" : "",
          pinned      ? "is-pinned"    : "",
          flagged     ? "is-flagged"   : "",
        ].filter(Boolean).join(" ")}
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        onClick={() => onSelect(restaurant)}
      >
        <span className="drag-handle compact-handle" onClick={(e) => e.stopPropagation()}>⠿</span>

        <button
          className={`icon-btn pin-btn${pinned ? " on" : ""}`}
          onClick={(e) => stopAndRun(e, () => onTogglePin(restaurant.id))}
          title={pinned ? "Unpin" : "Pin to top"}
        >★</button>

        <button
          className={`icon-btn flag-btn${flagged ? " on" : ""}`}
          onClick={(e) => stopAndRun(e, () => onToggleFlag(restaurant.id))}
          title={flagged ? "Remove urgency flag" : "Mark as urgent"}
        >🚨</button>

        <span className="compact-name">{restaurant.name}</span>
        <span className="compact-id">{restaurant.id}</span>

        <div style={{ position: "relative", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <button
            className={`status-badge ${cls}`}
            onClick={() => setShowStatusMenu((v) => !v)}
          >
            {restaurant.status} ▾
          </button>
          {showStatusMenu && <StatusMenu current={restaurant.status} onSelect={(s) => { onStatusChange(restaurant.id, s); setShowStatusMenu(false); }} />}
        </div>

        <span className="compact-tasks">
          {taskCount > 0 ? `${taskCount} task${taskCount !== 1 ? "s" : ""}` : "—"}
        </span>

        <button
          className="compact-open-btn"
          onClick={(e) => stopAndRun(e, () => onSelect(restaurant))}
        >
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
        isDragging  ? "is-dragging"  : "",
        isDragOver  ? "is-drag-over" : "",
        pinned      ? "is-pinned"    : "",
        flagged     ? "is-flagged"   : "",
      ].filter(Boolean).join(" ")}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(restaurant)}
    >
      {/* Drag handle */}
      <div className="drag-handle" onClick={(e) => e.stopPropagation()} title="Drag to reorder">⠿</div>

      {/* Pinned stripe */}
      {pinned && <div className="pinned-stripe" title="Pinned to top" />}

      <div className="card-top">
        <div className="card-name">
          {flagged && <span className="flag-dot" title="Needs attention">🚨</span>}
          {restaurant.name}
        </div>
        <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
          <button className={`status-badge ${cls}`} onClick={() => setShowStatusMenu((v) => !v)}>
            {restaurant.status} ▾
          </button>
          {showStatusMenu && (
            <StatusMenu
              current={restaurant.status}
              onSelect={(s) => { onStatusChange(restaurant.id, s); setShowStatusMenu(false); }}
            />
          )}
        </div>
      </div>

      <div className="card-meta">
        {restaurant.id}
        {restaurant.slack_channel && <> · #{restaurant.slack_channel}</>}
      </div>

      <div className="card-footer">
        <span className="task-count">
          {taskCount > 0 ? `${taskCount} task${taskCount !== 1 ? "s" : ""}` : "No tasks"}
        </span>

        {/* Pin & flag buttons */}
        <div className="card-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className={`icon-btn pin-btn${pinned ? " on" : ""}`}
            onClick={() => onTogglePin(restaurant.id)}
            title={pinned ? "Unpin" : "Pin to top"}
          >★</button>
          <button
            className={`icon-btn flag-btn${flagged ? " on" : ""}`}
            onClick={() => onToggleFlag(restaurant.id)}
            title={flagged ? "Remove flag" : "Mark as urgent"}
          >🚨</button>
        </div>

        <span className="search-hint">🔍 Search &amp; manage →</span>
      </div>
    </div>
  );
}

function StatusMenu({ current, onSelect }) {
  return (
    <div
      style={{
        position: "absolute", right: 0, top: "110%",
        background: "#fff", border: "1.5px solid #e8e0f5",
        borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        zIndex: 50, minWidth: 130, overflow: "hidden",
      }}
    >
      {STATUS_OPTIONS.map((s) => (
        <div
          key={s}
          onClick={() => onSelect(s)}
          style={{
            padding: "9px 14px", fontSize: 13, cursor: "pointer",
            fontWeight: current === s ? 700 : 400,
            color: current === s ? "#7326D3" : "#1a0040",
            background: current === s ? "#f3ebff" : "transparent",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f8f5ff")}
          onMouseLeave={(e) => (e.currentTarget.style.background = current === s ? "#f3ebff" : "transparent")}
        >
          {s}
        </div>
      ))}
    </div>
  );
}
