import { useState } from "react";

export default function NotesPanel({ notes, onAdd, onUpdate, onDelete }) {
  const [input, setInput]       = useState("");
  const [adding, setAdding]     = useState(false);
  const [editId, setEditId]     = useState(null);
  const [editText, setEditText] = useState("");
  const [deleteId, setDeleteId] = useState(null);

  const handleAdd = async () => {
    const text = input.trim();
    if (!text) return;
    setAdding(true);
    try {
      await onAdd(text);
      setInput("");
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (card) => {
    setEditId(card.id);
    setEditText(card.text);
    setDeleteId(null);
  };

  const cancelEdit = () => { setEditId(null); setEditText(""); };

  const saveEdit = async () => {
    const text = editText.trim();
    if (!text) return;
    await onUpdate(editId, text);
    setEditId(null);
    setEditText("");
  };

  const confirmDelete = async (id) => {
    await onDelete(id);
    setDeleteId(null);
  };

  return (
    <div className="notes-panel">
      <h3>📝 Team Notes &amp; Reminders</h3>

      {/* ── Add input row ── */}
      <div className="notes-add-row">
        <textarea
          className="notes-textarea"
          placeholder="Add a note or reminder…"
          value={input}
          rows={2}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAdd();
          }}
        />
        <button
          className="notes-save-btn"
          onClick={handleAdd}
          disabled={adding || !input.trim()}
        >
          {adding ? "Adding…" : "+ Add"}
        </button>
      </div>

      {/* ── Note cards ── */}
      {notes.length === 0 && (
        <p className="notes-empty">No notes yet. Add one above.</p>
      )}
      <div className="notes-cards">
        {notes.map((card) => (
          <div key={card.id} className="note-card">
            {editId === card.id ? (
              /* ── Edit mode ── */
              <div className="note-card-edit">
                <textarea
                  className="notes-textarea note-edit-textarea"
                  value={editText}
                  rows={3}
                  onChange={(e) => setEditText(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) saveEdit();
                    if (e.key === "Escape") cancelEdit();
                  }}
                />
                <div className="note-edit-actions">
                  <button className="note-save-btn" onClick={saveEdit} disabled={!editText.trim()}>Save</button>
                  <button className="note-cancel-btn" onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              /* ── View mode ── */
              <>
                <p className="note-card-text">{card.text}</p>
                <div className="note-card-actions">
                  <button
                    className="note-action-btn"
                    onClick={() => startEdit(card)}
                    title="Edit"
                  >✏</button>
                  {deleteId === card.id ? (
                    <span className="note-delete-confirm">
                      Delete?&nbsp;
                      <button className="note-del-yes" onClick={() => confirmDelete(card.id)}>Yes</button>
                      <button className="note-del-no"  onClick={() => setDeleteId(null)}>No</button>
                    </span>
                  ) : (
                    <button
                      className="note-action-btn note-action-btn--danger"
                      onClick={() => setDeleteId(card.id)}
                      title="Delete"
                    >🗑</button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
