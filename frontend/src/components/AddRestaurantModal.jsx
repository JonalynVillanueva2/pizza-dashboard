import { useState } from "react";

const STATUSES = ["Active", "Review", "At Risk", "Churned"];

export default function AddRestaurantModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    id: "",
    name: "",
    status: "Active",
    slack_channel: "",
    sop: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.id.trim()) return setError("RID is required.");
    if (!form.name.trim()) return setError("Restaurant name is required.");
    setSaving(true);
    try {
      await onSave({
        id:            form.id.trim().toUpperCase(),
        name:          form.name.trim(),
        status:        form.status,
        slack_channel: form.slack_channel.trim() || null,
        sop:           form.sop.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to add restaurant.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box add-resto-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Restaurant</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="add-resto-form" onSubmit={handleSubmit}>
          <label className="ar-label">
            RID <span className="ar-required">*</span>
            <input
              className="ar-input"
              placeholder="e.g. R99999"
              value={form.id}
              onChange={set("id")}
              autoFocus
            />
          </label>

          <label className="ar-label">
            Restaurant Name <span className="ar-required">*</span>
            <input
              className="ar-input"
              placeholder="e.g. Mario's Pizzeria"
              value={form.name}
              onChange={set("name")}
            />
          </label>

          <label className="ar-label">
            Status
            <select className="ar-input ar-select" value={form.status} onChange={set("status")}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label className="ar-label">
            Slack Channel <span className="ar-optional">(optional)</span>
            <input
              className="ar-input"
              placeholder="e.g. client-r99999-marios-pizzeria"
              value={form.slack_channel}
              onChange={set("slack_channel")}
            />
          </label>

          <label className="ar-label">
            SOP Link <span className="ar-optional">(optional)</span>
            <input
              className="ar-input"
              placeholder="https://docs.google.com/..."
              value={form.sop}
              onChange={set("sop")}
            />
          </label>

          {error && <p className="ar-error">{error}</p>}

          <div className="ar-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Adding…" : "Add Restaurant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
