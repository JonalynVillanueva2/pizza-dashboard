import { useState } from "react";

const STATUS_OPTIONS = ["All", "Active", "Review", "At Risk", "Churned"];

export default function BulkTaskModal({ restaurants, onSave, onClose }) {
  const [text, setText]               = useState("");
  const [dueDate, setDueDate]         = useState("");
  const [statusFilter, setFilter]     = useState("All");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  const affected = statusFilter === "All"
    ? restaurants.length
    : restaurants.filter((r) => r.status === statusFilter).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!text.trim()) return setError("Task text is required.");
    if (affected === 0)  return setError(`No restaurants have status "${statusFilter}".`);
    setSaving(true);
    try {
      await onSave({ text: text.trim(), due_date: dueDate || null, status_filter: statusFilter });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to add tasks.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop modal-backdrop--locked">
      <div className="modal-box add-resto-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Bulk Add Task</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="add-resto-form" onSubmit={handleSubmit}>
          <label className="ar-label">
            Task <span className="ar-required">*</span>
            <input
              className="ar-input"
              placeholder="e.g. Send weekly performance report"
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
            />
          </label>

          <label className="ar-label">
            Due Date <span className="ar-optional">(optional)</span>
            <input
              type="date"
              className="ar-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>

          <label className="ar-label">
            Add to restaurants with status
            <select
              className="ar-input ar-select"
              value={statusFilter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <div className="bulk-affected">
            This will add the task to{" "}
            <strong>{affected} restaurant{affected !== 1 ? "s" : ""}</strong>
            {statusFilter !== "All" && ` with status "${statusFilter}"`}.
          </div>

          {error && <p className="ar-error">{error}</p>}

          <div className="ar-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || affected === 0}
            >
              {saving
                ? "Adding…"
                : `Add to ${affected} Restaurant${affected !== 1 ? "s" : ""}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
