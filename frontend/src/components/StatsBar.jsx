const STATS = [
  { key: "total",   label: "Total Restaurants", icon: "🏪", cls: "total-card"   },
  { key: "active",  label: "Active",             icon: "✅", cls: "active-card"  },
  { key: "churned", label: "Churned",             icon: "❌", cls: "churned-card" },
  { key: "atRisk",  label: "At Risk",             icon: "⚠️", cls: "atrisk-card"  },
  { key: "review",  label: "Under Review",        icon: "🔍", cls: "review-card"  },
];

export default function StatsBar({ restaurants, onFilter }) {
  const counts = {
    total:   restaurants.length,
    active:  restaurants.filter((r) => r.status === "Active").length,
    churned: restaurants.filter((r) => r.status === "Churned").length,
    atRisk:  restaurants.filter((r) => r.status === "At Risk").length,
    review:  restaurants.filter((r) => r.status === "Review").length,
  };

  const filterMap = { total: "All", active: "Active", churned: "Churned", atRisk: "At Risk", review: "Review" };

  return (
    <div className="stats">
      {STATS.map((s) => (
        <div
          key={s.key}
          className={`stat-card ${s.cls}`}
          onClick={() => onFilter(filterMap[s.key])}
        >
          <div className="stat-icon">{s.icon}</div>
          <div>
            <div className="stat-num">{counts[s.key]}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
