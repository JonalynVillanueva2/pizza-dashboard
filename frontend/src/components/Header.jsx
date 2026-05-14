export default function Header() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="app-header">
      <div className="logo-group">
        {/* Tarro logo: overlapping leaf shapes + wordmark */}
        <div className="logo-icon">
          <svg width="44" height="36" viewBox="0 0 44 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Back leaf */}
            <rect x="4" y="2" width="14" height="19" rx="7" fill="#0FB888"
              transform="rotate(-20 11 11)" />
            {/* Front leaf */}
            <rect x="8" y="1" width="14" height="19" rx="7" fill="#1DE9B6"
              transform="rotate(15 15 10)" />
            {/* wordmark "tarro" */}
            <text x="26" y="23" fontFamily="-apple-system, sans-serif" fontWeight="800"
              fontSize="13" fill="#7326D3">tarro</text>
          </svg>
        </div>
        <div className="logo-text">
          <span className="logo-title">Pizza Dashboard</span>
          <span className="logo-subtitle">Restaurant Operations</span>
        </div>
      </div>
      <span className="header-date">{today}</span>
    </header>
  );
}
