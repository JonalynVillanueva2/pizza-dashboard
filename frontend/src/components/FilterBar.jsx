export default function FilterBar({
  filters, active, onChange,
  search, onSearch,
  viewMode, onViewModeChange,
  onExport,
}) {
  return (
    <div className="toolbar">
      {/* Filter tabs — grouped in white pill container */}
      <div className="filter-tabs">
        {filters.map((f) => (
          <button
            key={f}
            className={`filter-tab${active === f ? " active" : ""}`}
            onClick={() => onChange(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Search box */}
      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search by name or ID…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* View toggle */}
      <div className="view-toggle">
        <button
          className={`view-btn${viewMode === "grid" ? " active" : ""}`}
          onClick={() => onViewModeChange("grid")}
          title="Grid view"
        >⊞</button>
        <button
          className={`view-btn${viewMode === "list" ? " active" : ""}`}
          onClick={() => onViewModeChange("list")}
          title="List view"
        >☰</button>
      </div>

      {/* Export */}
      <button className="export-btn" onClick={onExport} title="Export to CSV">
        ↓ Export CSV
      </button>
    </div>
  );
}
