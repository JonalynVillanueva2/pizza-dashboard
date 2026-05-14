import { useState } from "react";

export default function NotesPanel({ notes, onSave }) {
  const [value, setValue] = useState(notes);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="notes-panel">
      <h3>📝 Team Notes &amp; Reminders</h3>
      <textarea
        className="notes-textarea"
        placeholder="Add team-wide notes, reminders, or follow-ups here…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button className="notes-save-btn" onClick={handleSave}>
        {saved ? "✓ Saved!" : "Save Notes"}
      </button>
    </div>
  );
}
