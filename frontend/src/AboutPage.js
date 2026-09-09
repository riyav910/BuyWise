import { useState, useEffect, useRef } from "react";
import { PLATFORMS, STATS, AnimatedCounter } from "./AppContent";

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

const STORY_STEPS = [
  {
    tag: "The problem",
    title: "Prices vary significantly between platforms",
    copy: "The same product can differ in price by 15–30% between quick-commerce apps, and those prices shift throughout the day. Checking each platform manually before every purchase isn't practical.",
  },
  {
    tag: "The approach",
    title: "One search across every platform",
    copy: "BuyWise queries Blinkit, Zepto, BigBasket and JioMart in parallel for a given product, returning all four results together instead of requiring separate searches.",
  },
  {
    tag: "The ranking",
    title: "Sorted by total cost, not list price",
    copy: "Results are ranked using delivery fees and active discounts, so the platform shown first is the one that's actually cheapest at checkout.",
  },
];

const HOW_STEPS = [
  {
    label: "Search",
    title: "Enter a product",
    copy: "Type any grocery or household item. The search runs against all supported platforms at once.",
  },
  {
    label: "Fetch",
    title: "Live data is retrieved",
    copy: "The backend scrapes current listings from each platform and caches the results in Redis, so repeat searches return instantly.",
  },
  {
    label: "Rank",
    title: "Results are scored",
    copy: "Each listing is scored on price plus delivery fee, minus any discount, and sorted accordingly.",
  },
  {
    label: "Compare",
    title: "You choose",
    copy: "View all platforms side by side and pick the best option, or set an alert to be notified of future price drops.",
  },
];

const STACK = [
  { name: "React", role: "Frontend", detail: "Client-side interface for Home, Compare, Deals and About, with routing between pages." },
  { name: "FastAPI", role: "Backend", detail: "Python API handling comparison requests, receipt OCR, and authentication endpoints." },
  { name: "Redis", role: "Caching", detail: "Stores recent scrape results so repeat searches don't require re-fetching from each platform." },
  { name: "Playwright", role: "Scraping", detail: "Automates browser sessions to retrieve live prices directly from each platform's website." },
  { name: "Tesseract OCR", role: "Receipts", detail: "Extracts item names and prices from uploaded receipt images." },
  { name: "Ranking model", role: "Comparison", detail: "Scores each result by total landed cost to determine the best available option." },
];

export default function AboutPage({ onNavigate }) {
  const [activeStory, setActiveStory] = useState(0);
  const [activeHow, setActiveHow] = useState(0);
  const [openStack, setOpenStack] = useState(null);

  const [storyRef, storyVisible] = useReveal();
  const [howRef, howVisible] = useReveal();
  const [stackRef, stackVisible] = useReveal();
  const [platformRef, platformVisible] = useReveal();

  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="about-hero-content">
          <div className="about-hero-tag">
            <span className="home-hero-tag-dot" />
            <span className="home-hero-tag-label">About BuyWise</span>
          </div>
          <h1 className="about-hero-title">
            A single place to compare<br />
            <span className="home-hero-title-accent">quick-commerce prices.</span>
          </h1>
          <p className="about-hero-copy">
            BuyWise compares live prices across Blinkit, Zepto, BigBasket and JioMart, and ranks results
            by total cost — including delivery — so you can see the best option at a glance.
          </p>

          <div className="about-hero-stats">
            {STATS.map((s, i) => (
              <div key={i} className="about-hero-stat">
                <div className="about-hero-stat-value">
                  <AnimatedCounter target={s.value} />
                </div>
                <div className="about-hero-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={storyRef} className={`about-story-section reveal ${storyVisible ? "reveal-visible" : ""}`}>
        <div className="home-workflow-title-wrap">
          <div className="home-workflow-badge">Background</div>
          <h2 className="home-workflow-heading">Why we built this</h2>
        </div>

        <div className="about-story-layout">
          <div className="about-story-tabs">
            {STORY_STEPS.map((s, i) => (
              <button
                key={i}
                className={`about-story-tab ${activeStory === i ? "about-story-tab-active" : ""}`}
                onClick={() => setActiveStory(i)}
              >
                <span className="about-story-tab-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="about-story-tab-text">
                  <span className="about-story-tab-tag">{s.tag}</span>
                  <span className="about-story-tab-title">{s.title}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="about-story-panel">
            <div className="about-story-panel-tag">{STORY_STEPS[activeStory].tag}</div>
            <h3 className="about-story-panel-title">{STORY_STEPS[activeStory].title}</h3>
            <p className="about-story-panel-copy">{STORY_STEPS[activeStory].copy}</p>
          </div>
        </div>
      </section>

      <section ref={howRef} className={`about-how-section reveal ${howVisible ? "reveal-visible" : ""}`}>
        <div className="home-workflow-title-wrap">
          <div className="home-workflow-badge">Process</div>
          <h2 className="home-workflow-heading">How it works</h2>
        </div>

        <div className="about-how-tabbar">
          {HOW_STEPS.map((t, i) => (
            <button
              key={i}
              className={`about-how-pill ${activeHow === i ? "about-how-pill-active" : ""}`}
              onClick={() => setActiveHow(i)}
            >
              {String(i + 1).padStart(2, "0")} · {t.label}
            </button>
          ))}
        </div>

        <div className="about-how-content">
          <div className="about-how-progress">
            {HOW_STEPS.map((_, i) => (
              <div key={i} className={`about-how-dot ${i <= activeHow ? "about-how-dot-active" : ""}`} />
            ))}
          </div>
          <h3 className="about-how-title">{HOW_STEPS[activeHow].title}</h3>
          <p className="about-how-copy">{HOW_STEPS[activeHow].copy}</p>
        </div>
      </section>

      <section ref={stackRef} className={`about-stack-section reveal ${stackVisible ? "reveal-visible" : ""}`}>
        <div className="home-workflow-title-wrap">
          <div className="home-workflow-badge">Technology</div>
          <h2 className="home-workflow-heading">What it's built with</h2>
        </div>

        <div className="about-stack-list">
          {STACK.map((item, i) => (
            <div key={i} className="about-stack-row">
              <button
                className="about-stack-row-header"
                onClick={() => setOpenStack(openStack === i ? null : i)}
              >
                <span className="about-stack-row-left">
                  <span className="about-stack-row-name">{item.name}</span>
                  <span className="about-stack-row-role">{item.role}</span>
                </span>
                <span className={`about-stack-row-chevron ${openStack === i ? "about-stack-row-chevron-open" : ""}`}>
                  ›
                </span>
              </button>
              {openStack === i && (
                <div className="about-stack-row-detail">{item.detail}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section ref={platformRef} className={`about-platforms-section reveal ${platformVisible ? "reveal-visible" : ""}`}>
        <div className="home-workflow-title-wrap">
          <div className="home-workflow-badge">Coverage</div>
          <h2 className="home-workflow-heading">Platforms we compare</h2>
        </div>
        <div className="about-platform-grid">
          {PLATFORMS.map((p) => (
            <div key={p.name} className="about-platform-card">
              <div className={`about-platform-initial platform-pill-${p.name.toLowerCase()}`}>{p.initial}</div>
              <div className="about-platform-name">{p.name}</div>
              <div className="about-platform-detail">Live prices, updated on every search</div>
            </div>
          ))}
        </div>
      </section>

      <section className="home-cta-section">
        <div className="home-cta-card">
          <div className="home-cta-copy">
            <h2 className="home-cta-title">See it in action</h2>
            <p className="home-cta-text">Run a comparison on your next grocery list and see the difference.</p>
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