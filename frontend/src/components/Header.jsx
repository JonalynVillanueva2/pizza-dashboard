import tarroLogo from '../tarro logo.png';
import tarroWhiteLogo from '../tarro white logo.png';

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
          <a className="tarro-logo" href="https://www.tarro.com" target="_blank" rel="noopener" title="Tarro">
            <img src={tarroWhiteLogo} alt="Tarro logo" className="tarro-img" />
          </a>
        </div>
        <div className="logo-divider"></div>
        <div className="logo-text">
          <span className="logo-title">🍕 Pizza Dashboard</span>
        
        </div>
      </div>
      <span className="header-date">{today}</span>
    </header>
  );
}
