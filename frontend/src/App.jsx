import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { api } from "./api.js";
import Header from "./components/Header.jsx";
import StatsBar from "./components/StatsBar.jsx";
import NotesPanel from "./components/NotesPanel.jsx";
import FilterBar from "./components/FilterBar.jsx";
import RestaurantGrid from "./components/RestaurantGrid.jsx";
import SearchModal from "./components/SearchModal.jsx";
import TaskSummaryPanel from "./components/TaskSummaryPanel.jsx";
import AddRestaurantModal from "./components/AddRestaurantModal.jsx";
import EditRestaurantModal from "./components/EditRestaurantModal.jsx";
import BulkTaskModal from "./components/BulkTaskModal.jsx";

const FILTERS = ["All", "Active", "At Risk", "Review", "Churned"];

export default function App() {
  const [restaurants, setRestaurants]   = useState([]);
  const [config, setConfig]             = useState({ slack: false, intercom: false });
  const [filter, setFilter]             = useState("All");
  const [search, setSearch]             = useState("");
  const [selected, setSelected]         = useState(null);
  const [notes, setNotes]               = useState("");
  const [loading, setLoading]           = useState(true);
  const [pins, setPins]                 = useState(new Set());
  const [flags, setFlags]               = useState(new Set());
  const [viewMode, setViewMode]         = useState("grid"); // "grid" | "list"
  const [allTasks, setAllTasks]         = useState({});
  const [showAddModal, setShowAddModal]   = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editTarget, setEditTarget]       = useState(null);
  const restaurantsRef = useRef([]);

  useEffect(() => { restaurantsRef.current = restaurants; }, [restaurants]);

  // Boot — load everything in parallel
  useEffect(() => {
    Promise.all([
      api.getRestaurants(),
      api.getConfig(),
      api.getNotes(),
      api.getOrder(),
      api.getPins(),
      api.getFlags(),
      api.getAllTasks(),
    ]).then(([restos, cfg, n, order, savedPins, savedFlags, tasks]) => {
      // Apply saved drag order
      if (order?.length > 0) {
        restos.sort((a, b) => {
          const ai = order.indexOf(a.id);
          const bi = order.indexOf(b.id);
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });
      }
      setRestaurants(restos);
      setConfig(cfg);
      setNotes(n.content || "");
      setPins(new Set(savedPins || []));
      setFlags(new Set(savedFlags || []));
      setAllTasks(tasks || {});
    }).finally(() => setLoading(false));
  }, []);

  // Pin sort: pinned restaurants always float to top, maintaining relative drag order within each group
  const pinSortedRestaurants = useMemo(() => {
    return [...restaurants].sort((a, b) => {
      const ap = pins.has(a.id) ? 0 : 1;
      const bp = pins.has(b.id) ? 0 : 1;
      return ap - bp; // stable sort preserves drag order within each group
    });
  }, [restaurants, pins]);

  const filtered = pinSortedRestaurants.filter((r) => {
    const matchFilter = filter === "All" || r.status === filter;
    const matchSearch =
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  // Status
  const handleStatusChange = useCallback((rid, newStatus) => {
    api.updateStatus(rid, newStatus);
    setRestaurants((prev) => prev.map((r) => r.id === rid ? { ...r, status: newStatus } : r));
    setSelected((prev) => prev?.id === rid ? { ...prev, status: newStatus } : prev);
  }, []);

  // Notes
  const handleSaveNotes = useCallback((content) => {
    setNotes(content);
    api.saveNotes(content);
  }, []);

  // Drag reorder
  const handleReorder = useCallback((draggedId, overId) => {
    setRestaurants((prev) => {
      const arr = [...prev];
      const from = arr.findIndex((r) => r.id === draggedId);
      const to   = arr.findIndex((r) => r.id === overId);
      if (from === -1 || to === -1 || from === to) return prev;
      arr.splice(to, 0, arr.splice(from, 1)[0]);
      return arr;
    });
  }, []);

  const handleSaveOrder = useCallback(() => {
    api.saveOrder(restaurantsRef.current.map((r) => r.id));
  }, []);

  // Pin toggle
  const handleTogglePin = useCallback((rid) => {
    setPins((prev) => {
      const next = new Set(prev);
      if (next.has(rid)) next.delete(rid);
      else next.add(rid);
      api.savePins([...next]);
      return next;
    });
  }, []);

  // Flag toggle
  const handleToggleFlag = useCallback((rid) => {
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(rid)) next.delete(rid);
      else next.add(rid);
      api.saveFlags([...next]);
      return next;
    });
  }, []);

  // Add restaurant — prepend to top and save new order
  const handleAddRestaurant = useCallback(async (data) => {
    const newResto = await api.addRestaurant(data);
    setRestaurants((prev) => {
      const updated = [newResto, ...prev];
      api.saveOrder(updated.map((r) => r.id));
      return updated;
    });
  }, []);

  // Toggle task directly from summary panel
  const handleToggleTaskSummary = useCallback(async (rid, taskId) => {
    const updated = await api.toggleTask(rid, taskId);
    setAllTasks((prev) => ({
      ...prev,
      [rid]: (prev[rid] || []).map((t) => t.id === taskId ? updated : t),
    }));
  }, []);

  // Bulk create tasks
  const handleBulkCreateTasks = useCallback(async (data) => {
    await api.bulkCreateTasks(data);
    api.getAllTasks().then(setAllTasks);
  }, []);

  // Update restaurant
  const handleUpdateRestaurant = useCallback(async (rid, data) => {
    await api.updateRestaurant(rid, data);
    setRestaurants((prev) =>
      prev.map((r) => r.id === rid ? { ...r, ...data } : r)
    );
    // If the selected modal is open for this restaurant, update it too
    setSelected((prev) => prev?.id === rid ? { ...prev, ...data } : prev);
  }, []);

  // Delete restaurant
  const handleDeleteRestaurant = useCallback(async (rid) => {
    await api.deleteRestaurant(rid);
    setRestaurants((prev) => prev.filter((r) => r.id !== rid));
    setPins((prev) => { const n = new Set(prev); n.delete(rid); return n; });
    setFlags((prev) => { const n = new Set(prev); n.delete(rid); return n; });
    setAllTasks((prev) => { const n = { ...prev }; delete n[rid]; return n; });
  }, []);

  // Reset order to restaurants.py sequence
  const handleResetOrder = useCallback(async () => {
    const newOrder = await api.resetOrder();
    setRestaurants((prev) => {
      const arr = [...prev];
      arr.sort((a, b) => {
        const ai = newOrder.indexOf(a.id);
        const bi = newOrder.indexOf(b.id);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
      return arr;
    });
  }, []);

  // Sort by status: Active → Review → At Risk → Churned
  const STATUS_PRIORITY = { Active: 0, Review: 1, "At Risk": 2, Churned: 3 };
  const handleSortByStatus = useCallback(() => {
    setRestaurants((prev) => {
      const sorted = [...prev].sort((a, b) => {
        const pa = STATUS_PRIORITY[a.status] ?? 99;
        const pb = STATUS_PRIORITY[b.status] ?? 99;
        return pa - pb;
      });
      api.saveOrder(sorted.map((r) => r.id));
      return sorted;
    });
  }, []);

  // Export CSV
  const handleExport = useCallback(() => {
    const headers = ["ID", "Name", "Status", "Pinned", "Flagged", "Slack Channel", "SOP"];
    const rows = restaurants.map((r) => [
      r.id,
      r.name,
      r.status,
      pins.has(r.id) ? "Yes" : "No",
      flags.has(r.id) ? "Yes" : "No",
      r.slack_channel || "",
      r.sop || "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `tarro-restaurants-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [restaurants, pins, flags]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="app-body">
        <StatsBar restaurants={restaurants} onFilter={setFilter} />
        <NotesPanel notes={notes} onSave={handleSaveNotes} />
        <TaskSummaryPanel
          allTasks={allTasks}
          restaurants={restaurants}
          onSelectRestaurant={setSelected}
          onToggleTask={handleToggleTaskSummary}
        />
        <FilterBar
          filters={FILTERS}
          active={filter}
          onChange={setFilter}
          search={search}
          onSearch={setSearch}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExport={handleExport}
          onSortByStatus={handleSortByStatus}
          onResetOrder={handleResetOrder}
          onBulkTask={() => setShowBulkModal(true)}
          onAddRestaurant={() => setShowAddModal(true)}
        />
        <RestaurantGrid
          restaurants={filtered}
          pins={pins}
          flags={flags}
          viewMode={viewMode}
          onSelect={setSelected}
          onStatusChange={handleStatusChange}
          onTogglePin={handleTogglePin}
          onToggleFlag={handleToggleFlag}
          onEdit={setEditTarget}
          onReorder={handleReorder}
          onSaveOrder={handleSaveOrder}
        />
      </div>

      {showBulkModal && (
        <BulkTaskModal
          restaurants={restaurants}
          onSave={handleBulkCreateTasks}
          onClose={() => setShowBulkModal(false)}
        />
      )}

      {showAddModal && (
        <AddRestaurantModal
          onSave={handleAddRestaurant}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editTarget && (
        <EditRestaurantModal
          restaurant={editTarget}
          onSave={handleUpdateRestaurant}
          onDelete={handleDeleteRestaurant}
          onClose={() => setEditTarget(null)}
        />
      )}

      {selected && (
        <SearchModal
          restaurant={selected}
          config={config}
          onStatusChange={handleStatusChange}
          onClose={() => {
            setSelected(null);
            api.getAllTasks().then(setAllTasks);
          }}
        />
      )}
    </>
  );
}
