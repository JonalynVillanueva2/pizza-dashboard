import { useState, useEffect, useRef } from "react";
import { api } from "../api.js";

const STATUS_OPTIONS = ["Active", "At Risk", "Review", "Churned"];

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
  onEdit, onDelete,
  isDragging, isDragOver,
  onDragStart, onDragOver, onDrop, onDragEnd,
}) {
  const [tasks, setTasks]                   = useState([]);
  const [showStatusMenu, setShowStatusMenu]   = useState(false);
  const [showDotMenu, setShowDotMenu]         = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting]               = useState(false);
  const [ridCopied, setRidCopied]             = useState(false);
  const dotMenuRef                            = useRef(null);

  useEffect(() => {
    api.getTasks(restaurant.id).then(setTasks);
  }, [restaurant.id]);

  // Close dot menu when clicking outside
  useEffect(() => {
    if (!showDotMenu) return;
    const handler = (e) => {
      if (dotMenuRef.current && !dotMenuRef.current.contains(e.target))
        setShowDotMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDotMenu]);

  const doneCount  = tasks.filter((t) => t.done).length;
  const totalCount = tasks.length;
  const progress   = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
  const hasSop     = !!restaurant.sop;
  const badgeCls   = BADGE_CLASS[restaurant.status] || "badge-Active";

  const stopAndRun = (e, fn) => { e.stopPropagation(); fn(); };

  const handleCopyId = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(restaurant.id).catch(() => {});
    setRidCopied(true);
    setTimeout(() => setRidCopied(false), 1500);
  };

  const openEdit = (e) => {
    e.stopPropagation();
    setShowDotMenu(false);
    setConfirmingDelete(false);
    onEdit(restaurant);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setConfirmingDelete(true);
  };

  const handleDeleteConfirm = async (e) => {
    e.stopPropagation();
    setDeleting(true);
    try { await onDelete(restaurant.id); }
    finally { setDeleting(false); setShowDotMenu(false); setConfirmingDelete(false); }
  };

  const handleDeleteCancel = (e) => {
    e.stopPropagation();
    setConfirmingDelete(false);
  };

  // ── Three-dot menu ───────────────────────────────────────────────
  const ThreeDotMenu = () => (
    <div className="three-dot-wrap" ref={dotMenuRef} onClick={(e) => e.stopPropagation()}>
      <button
        className="three-dot-btn"
        onClick={() => { setShowDotMenu((v) => !v); setConfirmingDelete(false); }}
        title="More options"
      >⋮</button>
      {showDotMenu && (
        <div className="three-dot-menu">
          <button className="three-dot-item" onClick={openEdit}>
            ✏ Edit
          </button>
          {!confirmingDelete ? (
            <button className="three-dot-item three-dot-item--danger" onClick={handleDeleteClick}>
              🗑 Delete
            </button>
          ) : (
            <div className="three-dot-confirm">
              <p className="three-dot-confirm-text">Delete restaurant &amp; all tasks?</p>
              <div className="three-dot-confirm-btns">
                <button className="three-dot-cancel-btn" onClick={handleDeleteCancel} disabled={deleting}>
                  Cancel
                </button>
                <button className="three-dot-delete-btn" onClick={handleDeleteConfirm} disabled={deleting}>
                  {deleting ? "…" : "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

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
        <span
          className={`compact-id${ridCopied ? " copied" : ""}`}
          onClick={handleCopyId}
          title="Click to copy RID"
        >
          {ridCopied ? "✓ Copied!" : restaurant.id}
        </span>

        <div style={{ position: "relative", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <button className={`status-badge ${badgeCls}`} onClick={() => setShowStatusMenu((v) => !v)}>
            {restaurant.status}
          </button>
          {showStatusMenu && (
            <StatusMenu current={restaurant.status}
              onSelect={(s) => { onStatusChange(restaurant.id, s); setShowStatusMenu(false); }} />
          )}
        </div>

        <ThreeDotMenu />

        <span className="compact-tasks">{doneCount}/{totalCount} tasks</span>

        {hasSop ? (
          <a href={restaurant.sop} target="_blank" rel="noreferrer"
            className="btn-sop compact-sop" onClick={(e) => e.stopPropagation()}>📄 SOP</a>
        ) : (
          <button className="btn-sop no-link compact-sop" disabled onClick={(e) => e.stopPropagation()}>📄 No SOP</button>
        )}

        <a
          href={`https://greendot.prod.letsdowonders.io/greendot/restaurant/${restaurant.id}`}
          target="_blank" rel="noreferrer"
          className="btn-gd compact-gd"
          onClick={(e) => e.stopPropagation()}
          title="Open in Green Dot"
        >🟢 GD</a>

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
          <div
            className={`resto-id${ridCopied ? " copied" : ""}`}
            onClick={handleCopyId}
            title="Click to copy RID"
          >
            {ridCopied ? "✓ Copied!" : restaurant.id}
          </div>
        </div>
        <div className="card-header-right" onClick={(e) => e.stopPropagation()}>
          <div className="status-wrap">
            <button className={`status-badge ${badgeCls}`} onClick={() => setShowStatusMenu((v) => !v)}>
              {restaurant.status}
            </button>
            {showStatusMenu && (
              <StatusMenu current={restaurant.status}
                onSelect={(s) => { onStatusChange(restaurant.id, s); setShowStatusMenu(false); }} />
            )}
          </div>
          <ThreeDotMenu />
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

        <a
          href={`https://greendot.prod.letsdowonders.io/greendot/restaurant/${restaurant.id}`}
          target="_blank" rel="noreferrer"
          className="btn-gd"
          onClick={(e) => e.stopPropagation()}
          title="Open in Green Dot"
        >🟢 GD</a>

        <button className="btn-tasks" onClick={(e) => stopAndRun(e, () => onSelect(restaurant))}>
          📋 Tasks <span className="task-count-badge">{totalCount}</span>
        </button>

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
