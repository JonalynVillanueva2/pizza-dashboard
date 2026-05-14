export default function FilterBar({
  filters, active, onChange,
  search, onSearch,
  viewMode, onViewModeChange,
  onExport,
}) {
  return (
    <div className="controls-wrapper">
      <div className="controls">
        <input
          className="search-box"
          type="text"
          placeholder="Search restaurants…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        {filters.map((f) => (
          <button
            key={f}
            className={`filter-btn${active === f ? " active" : ""}`}
            onClick={() => onChange(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="controls-right">
        {/* View mode toggle */}
        <div className="view-toggle">
          <button
            className={viewMode === "grid" ? "active" : ""}
            onClick={() => onViewModeChange("grid")}
            title="Grid view"
          >
            ⊞ Grid
          </button>
          <button
            className={viewMode === "list" ? "active" : ""}
            onClick={() => onViewModeChange("list")}
            title="Compact list view"
          >
            ☰ List
          </button>
        </div>

        {/* Export */}
        <button className="export-btn" onClick={onExport} title="Export to CSV">
          ↓ Export CSV
        </button>
      </div>
    </div>
  );
}
