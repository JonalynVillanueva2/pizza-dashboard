export default function FilterBar({ filters, active, onChange, search, onSearch }) {
  return (
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
  );
}
