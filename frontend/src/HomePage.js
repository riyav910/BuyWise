import { useState, useEffect, useRef } from "react";
import { PLATFORMS, STATS, FEATURES, TRENDING, AnimatedCounter } from "./AppContent";

function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.15 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

export default function HomePage({ onNavigate }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typedText, setTypedText] = useState("");
  const [alertEmail, setAlertEmail] = useState("");
  const [alertSet, setAlertSet] = useState(false);

  const placeholders = ["Search for Maggi noodles...", "Try Amul butter 500g...", "Compare Tata Tea prices..."];
  const placeholderRef = useRef(0);
  const charRef = useRef(0);
  const deletingRef = useRef(false);

  const [workflowRef, workflowVisible] = useReveal();
  const [trendingRef, trendingVisible] = useReveal();
  const [ctaRef, ctaVisible] = useReveal();
  const [alertRef, alertVisible] = useReveal();

  useEffect(() => {
    const tick = () => {
      const current = placeholders[placeholderRef.current];
      if (!deletingRef.current) {
        charRef.current++;
        setTypedText(current.slice(0, charRef.current));
        if (charRef.current === current.length) {
          deletingRef.current = true;
          setTimeout(tick, 1400);
          return;
        }
      } else {
        charRef.current--;
        setTypedText(current.slice(0, charRef.current));
        if (charRef.current === 0) {
          deletingRef.current = false;
          placeholderRef.current = (placeholderRef.current + 1) % placeholders.length;
        }
      }
      setTimeout(tick, deletingRef.current ? 40 : 70);
    };
    const t = setTimeout(tick, 600);
    return () => clearTimeout(t);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (onNavigate) onNavigate("compare", searchQuery);
  };

  const handleAlertSubmit = (e) => {
    e.preventDefault();
    if (alertEmail.trim()) setAlertSet(true);
  };

  return (
    <>
      <div className="home-page">

        <section className="home-hero-section">
           <div className="home-hero-glow" />
           <div className="home-hero-content"></div>
          <div className="home-hero-content">
            <div className="fade-up home-hero-tag">
              <span className="home-hero-tag-dot" />
              <span className="home-hero-tag-label">ML-powered · live price data</span>
            </div>

            <h1 className="fade-up-1 home-hero-title">
              Stop overpaying on<br />
              <span className="home-hero-title-accent">quick commerce</span>
            </h1>

            <p className="fade-up-2 home-hero-copy">
              BuyWise compares real-time prices across Blinkit, Zepto & Swiggy Instamart — and uses ML to predict when to buy.
            </p>

            <form className="fade-up-3 home-search-form" onSubmit={handleSearch}>
              <div className="home-search-inner">
                <span className="app-search-icon">🔍</span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={typedText}
                  className="home-search-input"
                />
                <span className="home-search-cursor" />
              </div>
              <button type="submit" className="home-search-submit">
                Search →
              </button>
            </form>

            

            <div className="fade-up-4 home-hero-cta">
              <button onClick={() => onNavigate && onNavigate("compare")} className="home-hero-cta-button">
                📊 Compare prices
              </button>
              <div className="home-platform-pill-row">
                {PLATFORMS.map((p) => (
                  <div key={p.name} className={`home-platform-pill platform-pill-${p.name.toLowerCase()}`}>
                    <div className="home-platform-pill-initial">{p.initial}</div>
                    <span className="home-platform-pill-label">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="home-stats-section">
          <div className="home-stats-grid">
            {STATS.map((s, i) => (
              <div key={i} className="home-stat-card">
                <div className="home-stat-value">
                  <AnimatedCounter target={s.value} />
                </div>
                <div className="home-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section
          ref={workflowRef}
          className={`home-workflow-section reveal ${workflowVisible ? "reveal-visible" : ""}`}
        >
          <div className="home-workflow-title-wrap">
            <div className="home-workflow-badge">How it works</div>
            <h2 className="home-workflow-heading">Three steps to smarter shopping</h2>
          </div>
          <div className="home-steps-grid">
            {[
              { step: "01", title: "Search a product", desc: "Type any grocery or household item — we scan all three platforms instantly.", icon: "🔍" },
              { step: "02", title: "Compare & analyse", desc: "Our ML model ranks results by true cost including delivery, discounts and stock risk.", icon: "📊" },
              { step: "03", title: "Buy at the right time", desc: "Follow AI buy-window suggestions or set an alert and let us notify you.", icon: "🔔" },
            ].map((item, i) => (
              <div key={i} className="home-step-card">
                <div className="home-step-header">
                  <span className="home-step-number">{item.step}</span>
                  <span className="home-step-icon">{item.icon}</span>
                </div>
                <div className="home-step-title">{item.title}</div>
                <div className="home-step-copy">{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* <section className="home-features-section">
          <div className="home-workflow-title-wrap">
            <div className="home-features-badge">Features</div>
            <h2 className="home-features-heading">Built for smart buyers</h2>
          </div>
          <div className="home-features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className={`home-feature-card home-feature-card-${i}`}>
                <div className="home-feature-header">{f.icon}</div>
                <div className="home-feature-title">{f.title}</div>
                <div className="home-feature-copy">{f.desc}</div>
              </div>
            ))}
          </div>
        </section> */}

        <section
          ref={trendingRef}
          className={`home-trending-section reveal ${trendingVisible ? "reveal-visible" : ""}`}
        >
          <div className="home-trending-header">
            <div>
              <div className="home-trending-badge">Trending now</div>
              <h2 className="home-trending-heading">Today's best deals</h2>
            </div>
            <button onClick={() => onNavigate && onNavigate("deals")} className="home-trending-action">
              See all deals →
            </button>
          </div>
          <div className="home-trending-card">
            {TRENDING.slice(0, 4).map((item, i) => (
              <div key={i} className="home-trending-item" onClick={() => onNavigate && onNavigate("deals")}>
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
        </section>

        <section
          ref={ctaRef}
          className={`home-cta-section reveal ${ctaVisible ? "reveal-visible" : ""}`}
        >
          <div className="home-cta-card">
            <div className="home-cta-copy">
              <h2 className="home-cta-title">Ready to save on every grocery run?</h2>
              <p className="home-cta-text">
                Compare prices across all three platforms and let our ML model tell you exactly when to buy.
              </p>
            </div>
            <div className="home-cta-actions">
              <button onClick={() => onNavigate && onNavigate("compare")} className="home-cta-button-primary">
                Compare prices →
              </button>
              <button onClick={() => onNavigate && onNavigate("search")} className="home-cta-button-secondary">
                Search a product
              </button>
            </div>
          </div>
        </section>

        <section
          ref={alertRef}
          className={`home-alert-section reveal ${alertVisible ? "reveal-visible" : ""}`}
        >
          <div className="home-alert-wrap">
            <div className="home-alert-badge">Price alerts</div>
            <h2 className="home-alert-heading">Get notified when prices drop</h2>
            <p className="home-alert-copy">Enter your email and we'll ping you when any product on your watchlist hits your target price.</p>
            {alertSet ? (
              <div className="home-alert-message">
                ✅ You're on the list! We'll notify you of price drops.
              </div>
            ) : (
              <form onSubmit={handleAlertSubmit} className="home-alert-form">
                <input
                  type="email"
                  required
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="home-alert-input"
                />
                <button type="submit" className="home-alert-submit">
                  Set alert 🔔
                </button>
              </form>
            )}
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
    </>
  );
}