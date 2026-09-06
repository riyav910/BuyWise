import { useEffect, useRef, useState } from "react";

export const COLORS = {
  green: "#1a3a2a",
  greenLight: "#4ade80",
  greenMid: "#16a34a",
  bg: "#f7f7f3",
  card: "#ffffff",
  text: "#111111",
  muted: "#666666",
  border: "#e5e5e0",
  zepto: "#1b1f7c",
  zeptoBg: "#f9f0fb",
  blinkit: "#c49b00",
  blinkitBg: "#fffbea",
  swiggy: "#e03900",
  swiggyBg: "#fff3ef",
  bigbasket: "#0d6efd",
  bigbasketBg: "#eff6ff",
  jiomart: "#0f766e",
  jiomartBg: "#ecfdf5",
  greenPale: "#d1fae5",
};

export const PLATFORM_META = {
  blinkit: {
    id: "blinkit",
    name: "Blinkit",
    initial: "B",
    color: COLORS.blinkit,
    bg: COLORS.blinkitBg,
    btnColor: "#d4a017",
    searchBase: "https://blinkit.com/s/?q=",
  },
  zepto: {
    id: "zepto",
    name: "Zepto",
    initial: "Z",
    color: COLORS.zepto,
    bg: COLORS.zeptoBg,
    btnColor: COLORS.zepto,
    searchBase: "https://www.zeptonow.com/search?query=",
  },
  bigbasket: {
    id: "bigbasket",
    name: "BigBasket",
    initial: "BB",
    color: COLORS.bigbasket,
    bg: COLORS.bigbasketBg,
    btnColor: COLORS.bigbasket,
    searchBase: "https://www.bigbasket.com/ps/?q=",
  },
  jiomart: {
    id: "jiomart",
    name: "JioMart",
    initial: "J",
    color: COLORS.jiomart,
    bg: COLORS.jiomartBg,
    btnColor: COLORS.jiomart,
    searchBase: "https://www.jiomart.com/search/",
  },
};

export const relatedProducts = [
  { emoji: "🥛", name: "Amul Gold Milk 500ml", save: "Save ₹8", best: "₹28", url: "https://blinkit.com/s/?q=amul+gold+milk+500ml", platform: "Blinkit" },
  { emoji: "🍵", name: "Tata Tea Premium 500g", save: "Save ₹22", best: "₹188", url: "https://blinkit.com/s/?q=tata+tea+premium+500g", platform: "Blinkit" },
  { emoji: "🍪", name: "Parle-G Biscuits 800g", save: "Save ₹15", best: "₹75", url: "https://blinkit.com/s/?q=parle+g+biscuits", platform: "Blinkit" },
  { emoji: "🥜", name: "Haldirams Namkeen 400g", save: "Save ₹22", best: "₹98", url: "https://blinkit.com/s/?q=haldirams+namkeen", platform: "Blinkit" },
  { emoji: "🦷", name: "Colgate 200g", save: "Save ₹18", best: "₹72", url: "https://blinkit.com/s/?q=colgate+toothpaste+200g", platform: "Blinkit" },
  { emoji: "🍊", name: "Tropicana OJ 1L", save: "Save ₹29", best: "₹90", url: "https://blinkit.com/s/?q=tropicana+orange+juice+1l", platform: "Blinkit" },
];

export const mlInsights = [
  "Blinkit consistently prices Nestle products 15–25% lower — model confidence 87%",
  "Maggi 12-pack dropped ₹18 on Blinkit in the last 7 days — downtrend detected",
  "Swiggy Instamart shows low stock — price may rise within 24–48 hours",
  "Optimal buy window: now (festival season discount active, ~3 days remaining)",
];

export const FEATURES = [
  {
    icon: "⚡",
    title: "Real-time price comparison",
    desc: "ML models track live prices across Blinkit, Zepto & Swiggy Instamart every few minutes.",
    color: "#fffbea",
    accent: COLORS.blinkit,
  },
  {
    icon: "🤖",
    title: "AI-powered insights",
    desc: "Predictive models detect price trends, stock patterns and optimal buy windows.",
    color: "#faf5ff",
    accent: "#7c3aed",
  },
  {
    icon: "🔔",
    title: "Smart price alerts",
    desc: "Set a target price and get notified the moment any platform drops below it.",
    color: COLORS.greenPale,
    accent: COLORS.greenMid,
  },
  {
    icon: "📊",
    title: "Cost breakdown",
    desc: "We factor in delivery fees, discounts and surge charges — so you see the real total.",
    color: "#fff3ef",
    accent: COLORS.swiggy,
  },
];

export const STATS = [
  { value: "3", label: "Platforms tracked" },
  { value: "50K+", label: "Products indexed" },
  { value: "87%", label: "ML model accuracy" },
  { value: "< 2 min", label: "Price refresh rate" },
];

export const PLATFORMS = [
  { name: "Blinkit", initial: "B", color: COLORS.blinkit, bg: "#fffbea" },
  { name: "Zepto", initial: "Z", color: COLORS.zepto, bg: "#f9f0fb" },
  { name: "BigBasket", initial: "BB", color: COLORS.bigbasket, bg: COLORS.bigbasketBg },
  { name: "JioMart", initial: "J", color: COLORS.jiomart, bg: COLORS.jiomartBg },
];

export const TRENDING = [
  { emoji: "🍜", name: "Maggi 12-pack", platform: "Blinkit", price: "₹108", save: "27% off" },
  { emoji: "🥛", name: "Amul Gold 500ml", platform: "Blinkit", price: "₹28", save: "Save ₹8" },
  { emoji: "🍵", name: "Tata Tea 500g", platform: "Blinkit", price: "₹188", save: "Save ₹22" },
  { emoji: "🍪", name: "Parle-G 800g", platform: "Blinkit", price: "₹75", save: "Save ₹15" },
  { emoji: "🥜", name: "Haldirams 400g", platform: "Zepto", price: "₹98", save: "Save ₹22" },
  { emoji: "🍊", name: "Tropicana OJ 1L", platform: "Blinkit", price: "₹90", save: "Save ₹29" },
];

export function Badge({ children, variant = "default" }) {
  return <span className={`app-badge app-badge--${variant}`}>{children}</span>;
}

export function PlatformCard({ item }) {
  const total = item.price + item.delivery;
  const pillClass = `app-platform-card-pill app-platform-card-pill--${item.id}`;
  const buttonClass = `app-platform-card-button app-platform-card-button--${item.id}`;

  return (
    <div className="app-platform-card fade-up">
      <div className="app-platform-card-top">
        <div className="app-platform-card-brand">
          <div className={pillClass}>{item.initial}</div>
          <div>
            <div className="app-platform-card-name">{item.name}</div>
            <div className="app-platform-card-subtitle">{item.platformLabel}</div>
          </div>
        </div>
        {item.best && <Badge variant="success">Best price</Badge>}
      </div>

      <div className="app-platform-card-price-row">
        <span className="app-platform-card-price">₹{item.price}</span>
        {item.original > item.price && <span className="app-platform-card-original">₹{item.original}</span>}
        <span className="app-platform-card-discount">
          {item.discount > 0 ? `${item.discount}% off` : item.price === item.original ? "No discount" : ""}
        </span>
      </div>

      <div className="app-platform-card-chip-row">
        <span className={`app-chip app-chip--${item.deliveryChip}`}>{item.deliveryLabel}</span>
        <span className="app-chip app-chip--neutral">{item.time}</span>
        <span className={`app-chip app-chip--${item.stockChip}`}>{item.stock}</span>
      </div>

      <div className="app-platform-card-total-row">
        <span>Total</span>
        <span className={item.best ? "app-platform-card-total-best" : "app-platform-card-total"}>₹{total}</span>
      </div>

      <a
        href={`${item.searchUrl}${encodeURIComponent(item.product_name)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
      >
        Buy on {item.name}
      </a>
    </div>
  );
}

export function BarRow({ label, price, maxPrice, color }) {
  const pct = Math.max(8, Math.round((price / maxPrice) * 100));
  return (
    <div className="app-bar-row">
      <span className="app-bar-label">{label}</span>
      <div className="app-bar-track">
        <div className="app-bar-fill" style={{ "--bar-width": `${pct}%`, "--bar-color": color }} />
      </div>
      <span className="app-bar-value">₹{price}</span>
    </div>
  );
}

export function RelatedCard({ p }) {
  return (
    <a href={p.url} target="_blank" rel="noopener noreferrer" className="app-related-card">
      <span className="app-related-emoji">{p.emoji}</span>
      <div className="app-related-name">{p.name}</div>
      <div className="app-related-save">{p.save}</div>
      <div className="app-related-meta">Best: {p.best} on {p.platform}</div>
    </a>
  );
}

export function AnimatedCounter({ target, suffix = "" }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const numTarget = parseFloat(target.replace(/[^0-9.]/g, ""));
          if (isNaN(numTarget)) return;
          const duration = 1200;
          const steps = 40;
          const step = numTarget / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += step;
            if (current >= numTarget) {
              current = numTarget;
              clearInterval(timer);
            }
            setCount(Math.round(current));
          }, duration / steps);
        }
      },
      { threshold: 0.4 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  const isText = isNaN(parseFloat(target));
  return <span ref={ref}>{isText ? target : `${count}${suffix}`}</span>;
}
