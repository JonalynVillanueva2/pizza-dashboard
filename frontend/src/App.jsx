import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { api } from "./api.js";
import Header from "./components/Header.jsx";
import StatsBar from "./components/StatsBar.jsx";
import NotesPanel from "./components/NotesPanel.jsx";
import FilterBar from "./components/FilterBar.jsx";
import RestaurantGrid from "./components/RestaurantGrid.jsx";
import SearchModal from "./components/SearchModal.jsx";

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
    ]).then(([restos, cfg, n, order, savedPins, savedFlags]) => {
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
        <FilterBar
          filters={FILTERS}
          active={filter}
          onChange={setFilter}
          search={search}
          onSearch={setSearch}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExport={handleExport}
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
          onReorder={handleReorder}
          onSaveOrder={handleSaveOrder}
        />
      </div>

      {selected && (
        <SearchModal
          restaurant={selected}
          config={config}
          onStatusChange={handleStatusChange}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
