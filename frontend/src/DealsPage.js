import { useState } from "react";
import { TRENDING } from "./AppContent";

export default function DealsPage({ onNavigate }) {
  const [filter, setFilter] = useState("All");
  const platforms = ["All", ...new Set(TRENDING.map((t) => t.platform))];
  const deals = filter === "All" ? TRENDING : TRENDING.filter((t) => t.platform === filter);

  return (
    <div className="deals-page">
      <section className="deals-hero">
        <div className="home-hero-tag">
          <span className="home-hero-tag-dot" />
          <span className="home-hero-tag-label">Updated live</span>
        </div>
        <h1 className="deals-hero-title">Today's best deals</h1>
        <p className="deals-hero-copy">
          The biggest price drops we've found across Blinkit, Zepto, BigBasket and JioMart right now.
        </p>
      </section>

      <section className="deals-filter-section">
        <div className="deals-filter-row">
          {platforms.map((p) => (
            <button
              key={p}
              className={`deals-filter-chip ${filter === p ? "deals-filter-chip-active" : ""}`}
              onClick={() => setFilter(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      <section className="deals-grid-section">
        <div className="deals-grid">
          {deals.map((item, i) => (
            <div key={i} className="home-trending-item deals-item" onClick={() => onNavigate && onNavigate("compare", item.name)}>
              <span className="home-trending-emoji">{item.emoji}</span>
              <div className="home-trending-name">{item.name}</div>
              <div className="home-trending-price">{item.price}</div>
              <div className="home-trending-row">
                <span className="home-trending-save">{item.save}</span>
                <span className="home-trending-platform">{item.platform}</span>
              </div>
            </div>
          ))}
        </div>
        {deals.length === 0 && (
          <div className="app-card app-card-empty">
            <div className="app-card-title">No deals for this platform right now.</div>
          </div>
        )}
      </section>

      <section className="home-cta-section">
        <div className="home-cta-card">
          <div className="home-cta-copy">
            <h2 className="home-cta-title">Don't see what you're after?</h2>
            <p className="home-cta-text">Search any product directly and compare it across every platform.</p>
          </div>
          <div className="home-cta-actions">
            <button onClick={() => onNavigate && onNavigate("compare")} className="home-cta-button-primary">
              Compare prices →
            </button>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="home-footer-brand">
          Buy<span className="home-brand-accent">Wise</span>
        </div>
        <p className="home-footer-copy">
          ML-powered price comparison · Prices are indicative and may vary · Built for educational purposes
        </p>
      </footer>
    </div>
  );
}