const BASE = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export const api = {
  getRestaurants: () => request("/api/restaurants"),
  getConfig:      () => request("/api/config"),

  search: (rid, q, sources = "all") =>
    request(`/api/search/${rid}?q=${encodeURIComponent(q)}&sources=${sources}`),

  getAllTasks: () => request("/api/tasks"),
  getTasks: (rid) => request(`/api/tasks/${rid}`),
  createTask: (rid, text, due_date = null) =>
    request(`/api/tasks/${rid}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, due_date }),
    }),
  toggleTask: (rid, taskId) =>
    request(`/api/tasks/${rid}/${taskId}`, { method: "PATCH" }),
  deleteTask: (rid, taskId) =>
    request(`/api/tasks/${rid}/${taskId}`, { method: "DELETE" }),

  getNotes:   () => request("/api/notes"),
  saveNotes:  (content) =>
    request("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }),

  updateStatus: (rid, status) =>
    request(`/api/status/${rid}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),

  getOrder:  () => request("/api/order"),
  saveOrder: (order) =>
    request("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    }),

  getPins:   () => request("/api/pins"),
  savePins:  (pins) =>
    request("/api/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pins }),
    }),

  getFlags:  () => request("/api/flags"),
  saveFlags: (flags) =>
    request("/api/flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flags }),
    }),
};
