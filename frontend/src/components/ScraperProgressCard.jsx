import React, { useState, useEffect } from "react";

function getProductEmoji(name = "") {
  const n = name.toLowerCase();
  if (n.includes("milk") || n.includes("dairy")) return "🥛";
  if (n.includes("bread") || n.includes("bun") || n.includes("pav")) return "🍞";
  if (n.includes("butter") || n.includes("cheese") || n.includes("paneer")) return "🧈";
  if (n.includes("egg")) return "🥚";
  if (n.includes("tea") || n.includes("chai")) return "🍵";
  if (n.includes("coffee")) return "☕";
  if (n.includes("noodle") || n.includes("maggi") || n.includes("pasta")) return "🍜";
  if (n.includes("rice") || n.includes("basmati") || n.includes("flour") || n.includes("atta")) return "🍚";
  if (n.includes("biscuit") || n.includes("cookie") || n.includes("oreo") || n.includes("parle")) return "🍪";
  if (n.includes("oil") || n.includes("ghee")) return "🫒";
  if (n.includes("shampoo") || n.includes("soap") || n.includes("wash")) return "🧴";
  if (n.includes("chocolate") || n.includes("sweet")) return "🍫";
  if (n.includes("apple") || n.includes("banana") || n.includes("fruit")) return "🍎";
  if (n.includes("onion") || n.includes("potato") || n.includes("tomato") || n.includes("veg")) return "🥔";
  return "🛍️";
}

const TIPS = [
  "💡 Smart Cart Optimizer checks whether buying everything at one store or splitting saves more money on delivery fees.",
  "⚖️ Unit Rate Normalization: We calculate price-per-gram and price-per-ml so pack sizes are fairly compared.",
  "⚡ Stealth Scrapers: Real-time prices, discounts & delivery charges are extracted in parallel across platforms.",
  "🎯 Guaranteed Best Checkout: We factor in each store's delivery charges and handling fees before recommending."
];

export default function ScraperProgressCard({ searchQuery = "", loadingPhase = "scraping" }) {
  const [elapsed, setElapsed] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  // Parse searched items
  const items = searchQuery
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Timer for elapsed seconds
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsed(((Date.now() - startTime) / 1000).toFixed(1));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Tip rotation
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 3200);
    return () => clearInterval(tipInterval);
  }, []);

  const isScraping = loadingPhase === "scraping" || parseFloat(elapsed) < 2.8;
  const progressPercent = isScraping
    ? Math.min(65, Math.max(15, 15 + Math.round(parseFloat(elapsed) * 18)))
    : Math.min(96, Math.max(70, 70 + Math.round((parseFloat(elapsed) - 2.8) * 8)));

  return (
    <div className="scraper-progress-card fade-up">
      {/* GLOW DECORATION */}
      <div className="scraper-progress-glow" />

      {/* TOP HEADER */}
      <div className="scraper-progress-header">
        <div className="scraper-progress-title-wrap">
          <div className="scraper-progress-badge-row">
            <span className={`scraper-status-pill ${isScraping ? "pulse-amber" : "pulse-green"}`}>
              <span className="scraper-status-dot" />
              {isScraping ? "⚡ Scraping Live Platforms" : "🧠 Comparing & Optimizing Carts"}
            </span>
            <span className="scraper-timer-pill">
              ⏱️ {elapsed}s elapsed
            </span>
          </div>

          <h2 className="scraper-progress-heading">
            {isScraping
              ? "Fetching live prices from platforms..."
              : "Comparing prices & optimizing your carts..."}
          </h2>

          <p className="scraper-progress-subtext">
            {isScraping
              ? "Scraping real-time product prices, stock, and delivery fees across Blinkit, Zepto & BigBasket..."
              : "Normalizing quantities (per kg/L), factoring delivery thresholds & evaluating split-order savings..."}
          </p>
        </div>

        {/* ROTATING ICON ORB */}
        <div className="scraper-orb-wrap">
          <div className={`scraper-orb-ring ${isScraping ? "ring-amber" : "ring-green"}`} />
          <div className="scraper-orb-center">
            {isScraping ? "🛒" : "⚡"}
          </div>
        </div>
      </div>

      {/* ITEMS BEING SEARCHED */}
      {items.length > 0 && (
        <div className="scraper-items-row">
          <span className="scraper-items-label">Searching for:</span>
          <div className="scraper-items-chips">
            {items.map((item, idx) => (
              <span key={idx} className="scraper-item-chip">
                <span>{getProductEmoji(item)}</span>
                <strong>{item}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* PROGRESS BAR */}
      <div className="scraper-bar-container">
        <div className="scraper-bar-track">
          <div
            className="scraper-bar-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="scraper-bar-meta">
          <span>{isScraping ? "Scraping quick-commerce stores..." : "Calculating cheapest checkout combination..."}</span>
          <span style={{ fontWeight: 700 }}>{progressPercent}%</span>
        </div>
      </div>

      {/* 3-STEP PIPELINE TRACKER */}
      <div className="scraper-stepper">
        <div className="scraper-step scraper-step--completed">
          <div className="scraper-step-circle">✓</div>
          <div className="scraper-step-label">1. Cache & Store Connect</div>
        </div>

        <div className="scraper-step-connector scraper-step-connector--active" />

        <div className={`scraper-step ${isScraping ? "scraper-step--active" : "scraper-step--completed"}`}>
          <div className="scraper-step-circle">
            {isScraping ? <span className="scraper-step-spinner" /> : "✓"}
          </div>
          <div className="scraper-step-label">2. Live Scraper Fetch</div>
        </div>

        <div className={`scraper-step-connector ${!isScraping ? "scraper-step-connector--active" : ""}`} />

        <div className={`scraper-step ${!isScraping ? "scraper-step--active" : "scraper-step--pending"}`}>
          <div className="scraper-step-circle">
            {!isScraping ? <span className="scraper-step-spinner" /> : "3"}
          </div>
          <div className="scraper-step-label">3. Cart Optimization</div>
        </div>
      </div>

      {/* PLATFORMS LIVE STATUS TILES */}
      <div className="scraper-platforms-grid">
        {/* BLINKIT */}
        <div className="scraper-platform-tile platform-blinkit">
          <div className="scraper-platform-top">
            <span className="scraper-platform-avatar avatar-blinkit">B</span>
            <div className="scraper-platform-name">Blinkit</div>
            <span className={`scraper-mini-dot ${isScraping ? "dot-pulsing-yellow" : "dot-done"}`} />
          </div>
          <div className="scraper-platform-status">
            {isScraping ? "Scraping catalog & ETA..." : "Prices extracted ✓"}
          </div>
        </div>

        {/* ZEPTO */}
        <div className="scraper-platform-tile platform-zepto">
          <div className="scraper-platform-top">
            <span className="scraper-platform-avatar avatar-zepto">Z</span>
            <div className="scraper-platform-name">Zepto</div>
            <span className={`scraper-mini-dot ${isScraping ? "dot-pulsing-purple" : "dot-done"}`} />
          </div>
          <div className="scraper-platform-status">
            {isScraping ? "Fetching 10-min live prices..." : "Prices extracted ✓"}
          </div>
        </div>

        {/* BIGBASKET */}
        <div className="scraper-platform-tile platform-bigbasket">
          <div className="scraper-platform-top">
            <span className="scraper-platform-avatar avatar-bigbasket">BB</span>
            <div className="scraper-platform-name">BigBasket</div>
            <span className={`scraper-mini-dot ${isScraping ? "dot-pulsing-blue" : "dot-done"}`} />
          </div>
          <div className="scraper-platform-status">
            {isScraping ? "Extracting pack sizes & fees..." : "Prices extracted ✓"}
          </div>
        </div>
      </div>

      {/* ROTATING SMART TIP */}
      <div className="scraper-tip-banner">
        <span className="scraper-tip-text">{TIPS[tipIndex]}</span>
      </div>
    </div>
  );
}
