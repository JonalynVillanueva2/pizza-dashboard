import { useState } from "react";

const STATUSES = ["Active", "Review", "At Risk", "Churned"];

export default function EditRestaurantModal({ restaurant, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    name:          restaurant.name,
    status:        restaurant.status,
    slack_channel: restaurant.slack_channel || "",
    sop:           restaurant.sop || "",
  });
  const [error, setSaving_error]   = useState("");
  const [saving, setSaving]        = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]    = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving_error("");
    if (!form.name.trim()) return setSaving_error("Restaurant name is required.");
    setSaving(true);
    try {
      await onSave(restaurant.id, {
        name:          form.name.trim(),
        status:        form.status,
        slack_channel: form.slack_channel.trim() || null,
        sop:           form.sop.trim() || null,
      });
      onClose();
    } catch (err) {
      setSaving_error(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(restaurant.id);
      onClose();
    } catch (err) {
      setSaving_error(err.message || "Failed to delete restaurant.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="modal-backdrop modal-backdrop--locked">
      <div className="modal-box add-resto-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Restaurant</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="add-resto-form" onSubmit={handleSubmit}>
          {/* RID — read-only */}
          <label className="ar-label">
            RID
            <div className="ar-readonly">{restaurant.id}</div>
          </label>

          <label className="ar-label">
            Restaurant Name <span className="ar-required">*</span>
            <input
              className="ar-input"
              value={form.name}
              onChange={set("name")}
              autoFocus
            />
          </label>

          <label className="ar-label">
            Status
            <select className="ar-input ar-select" value={form.status} onChange={set("status")}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
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
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>

        {/* Delete zone */}
        <div className="ar-delete-zone">
          {!confirmDelete ? (
            <button className="btn-delete-trigger" onClick={() => setConfirmDelete(true)}>
              🗑 Delete Restaurant
            </button>
          ) : (
            <div className="ar-confirm-delete">
              <p>This will permanently delete <strong>{restaurant.name}</strong> and all its tasks. Are you sure?</p>
              <div className="ar-confirm-actions">
                <button className="btn-secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                  Cancel
                </button>
                <button className="btn-delete-confirm" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Deleting…" : "Yes, Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
