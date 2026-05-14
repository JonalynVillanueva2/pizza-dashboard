import { useState, useEffect } from "react";
import { api } from "../api.js";

const STATUS_OPTIONS = ["Active", "At Risk", "Review", "Churned"];

const STATUS_CLASS = {
  "Active":  "Active",
  "At Risk": "AtRisk",
  "Churned": "Churned",
  "Review":  "Review",
};

export default function RestaurantCard({ restaurant, onSelect, onStatusChange }) {
  const [taskCount, setTaskCount] = useState(0);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  useEffect(() => {
    api.getTasks(restaurant.id).then((tasks) => setTaskCount(tasks.length));
  }, [restaurant.id]);

  const handleStatusClick = (e) => {
    e.stopPropagation();
    setShowStatusMenu((v) => !v);
  };

  const handleStatusSelect = (e, status) => {
    e.stopPropagation();
    onStatusChange(restaurant.id, status);
    setShowStatusMenu(false);
  };

  const cls = STATUS_CLASS[restaurant.status] || "Active";

  return (
    <div
      className={`resto-card${restaurant.status === "Churned" ? " churned" : ""}`}
      onClick={() => onSelect(restaurant)}
    >
      <div className="card-top">
        <div className="card-name">{restaurant.name}</div>
        <div style={{ position: "relative" }}>
          <button
            className={`status-badge ${cls}`}
            onClick={handleStatusClick}
            title="Click to change status"
          >
            {restaurant.status} ▾
          </button>
          {showStatusMenu && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "110%",
                background: "#fff",
                border: "1.5px solid #e8e0f5",
                borderRadius: 10,
                boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                zIndex: 50,
                minWidth: 130,
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {STATUS_OPTIONS.map((s) => (
                <div
                  key={s}
                  onClick={(e) => handleStatusSelect(e, s)}
                  style={{
                    padding: "9px 14px",
                    fontSize: 13,
                    cursor: "pointer",
                    fontWeight: restaurant.status === s ? 700 : 400,
                    color: restaurant.status === s ? "#7326D3" : "#1a0040",
                    background: restaurant.status === s ? "#f3ebff" : "transparent",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8f5ff")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      restaurant.status === s ? "#f3ebff" : "transparent")
                  }
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card-meta">
        {restaurant.id}
        {restaurant.slack_channel && (
          <> · #{restaurant.slack_channel}</>
        )}
      </div>

      <div className="card-footer">
        <span className="task-count">
          {taskCount > 0 ? `${taskCount} task${taskCount !== 1 ? "s" : ""}` : "No tasks"}
        </span>
        <span className="search-hint">🔍 Search &amp; manage →</span>
      </div>
    </div>
  );
}
