export default function StatsBar({ restaurants }) {
  const total   = restaurants.length;
  const active  = restaurants.filter((r) => r.status === "Active").length;
  const atRisk  = restaurants.filter((r) => r.status === "At Risk").length;
  const churned = restaurants.filter((r) => r.status === "Churned").length;
  const review  = restaurants.filter((r) => r.status === "Review").length;

  const stats = [
    { label: "Total",    value: total,   color: "#7326D3" },
    { label: "Active",   value: active,  color: "#16a34a" },
    { label: "At Risk",  value: atRisk,  color: "#d97706" },
    { label: "Churned",  value: churned, color: "#9ca3af" },
    { label: "Review",   value: review,  color: "#2563eb" },
  ];

  return (
    <div className="stats-bar">
      {stats.map((s) => (
        <div className="stat-card" key={s.label}>
          <span className="stat-value" style={{ color: s.color }}>{s.value}</span>
          <span className="stat-label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
