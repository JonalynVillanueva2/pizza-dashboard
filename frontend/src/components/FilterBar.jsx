export default function FilterBar({
  filters, active, onChange,
  search, onSearch,
  viewMode, onViewModeChange,
  onExport, onSortByStatus, onResetOrder, onAddRestaurant, onBulkTask,
}) {
  return (
    <div className="toolbar">
      {/* Filter tabs */}
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

      {/* Search */}
      <div className="search-box">
        <input
          type="text"
          placeholder="Search by name or ID…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* View toggle */}
      <div className="view-toggle">
        <button className={`view-btn${viewMode === "grid" ? " active" : ""}`}
          onClick={() => onViewModeChange("grid")} title="Grid view">⊞</button>
        <button className={`view-btn${viewMode === "list" ? " active" : ""}`}
          onClick={() => onViewModeChange("list")} title="List view">☰</button>
      </div>

      {/* Sort buttons group */}
      <div className="sort-group">
        <button className="sort-btn" onClick={onSortByStatus}
          title="Sort: Active → Review → At Risk → Churned">
          ↕ By Status
        </button>
        <button className="sort-btn sort-btn--reset" onClick={onResetOrder}
          title="Apply the order from restaurants.py">
          ↺ Default Order
        </button>
      </div>

      {/* Bulk task */}
      <button className="bulk-task-btn" onClick={onBulkTask} title="Add the same task to multiple restaurants">
        + Bulk Task
      </button>

      {/* Add restaurant */}
      <button className="add-resto-btn" onClick={onAddRestaurant}>
        + Add Restaurant
      </button>

      {/* Export */}
      <button className="export-btn" onClick={onExport}>↓ Export CSV</button>
    </div>
  );
}
