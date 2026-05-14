import { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";
import Header from "./components/Header.jsx";
import StatsBar from "./components/StatsBar.jsx";
import NotesPanel from "./components/NotesPanel.jsx";
import FilterBar from "./components/FilterBar.jsx";
import RestaurantGrid from "./components/RestaurantGrid.jsx";
import SearchModal from "./components/SearchModal.jsx";

const FILTERS = ["All", "Active", "At Risk", "Review", "Churned"];

export default function App() {
  const [restaurants, setRestaurants] = useState([]);
  const [config, setConfig] = useState({ slack: false, intercom: false });
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  // Boot
  useEffect(() => {
    Promise.all([api.getRestaurants(), api.getConfig(), api.getNotes()])
      .then(([restos, cfg, n]) => {
        setRestaurants(restos);
        setConfig(cfg);
        setNotes(n.content || "");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = useCallback((rid, newStatus) => {
    api.updateStatus(rid, newStatus);
    setRestaurants((prev) =>
      prev.map((r) => (r.id === rid ? { ...r, status: newStatus } : r))
    );
  }, []);

  const handleSaveNotes = useCallback((content) => {
    setNotes(content);
    api.saveNotes(content);
  }, []);

  const filtered = restaurants.filter((r) => {
    const matchFilter = filter === "All" || r.status === filter;
    const matchSearch =
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

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
        <StatsBar restaurants={restaurants} />
        <NotesPanel notes={notes} onSave={handleSaveNotes} />
        <FilterBar
          filters={FILTERS}
          active={filter}
          onChange={setFilter}
          search={search}
          onSearch={setSearch}
        />
        <RestaurantGrid
          restaurants={filtered}
          onSelect={setSelected}
          onStatusChange={handleStatusChange}
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
