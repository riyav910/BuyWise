import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Search,
  ArrowRight,
  TrendingDown,
  Clock,
  ShoppingCart,
  Zap,
  Shield,
  BarChart3,
} from "lucide-react";

const API = "http://127.0.0.1:8000";

const PLATFORMS = [
  { name: "Blinkit", color: "#F6C828" },
  { name: "Zepto", color: "#CC00FF" },
  { name: "Swiggy Instamart", color: "#FC8019" },
  { name: "BigBasket", color: "#84C225" },
  { name: "JioMart", color: "#005EAA" },
];

const FEATURES = [
  {
    icon: TrendingDown,
    title: "Price Comparison",
    desc: "Real-time prices across platforms. Find cheapest instantly.",
  },
  {
    icon: ShoppingCart,
    title: "Basket Optimization",
    desc: "Smart cart optimization to reduce total cost.",
  },
  {
    icon: Clock,
    title: "Delivery Estimates",
    desc: "Compare delivery times across platforms.",
  },
  {
    icon: Zap,
    title: "Smart Deep Links",
    desc: "Redirect to best deal instantly.",
  },
  {
    icon: Shield,
    title: "Wallet Comparison",
    desc: "Compare cashback & offers.",
  },
  {
    icon: BarChart3,
    title: "Savings Analytics",
    desc: "Track your savings over time.",
  },
];

export default function LandingPage() {
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`${API}/stats`)
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/compare?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div style={{ overflowX: "hidden" }}>

      {/* HERO SECTION */}
     <section 
  style={{
    background: "#111827",
    color: "white",
    padding: "100px 0",
    marginTop: "10px", 
    position: "relative",
    overflow: "hidden",
  }}
>
  <div
    style={{
      maxWidth: "1100px",
      margin: "0 auto",
      padding: "0 20px",
      position: "relative",
      zIndex: 1,
    }}
  >
    <div style={{ maxWidth: "700px" }}>

      {/* PLATFORM TAGS */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        {PLATFORMS.map((p, i) => (
          <span
            key={i}
            style={{
              backgroundColor: p.color + "20",
              color: p.color,
              padding: "6px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            {p.name}
          </span>
        ))}
      </div>

      {/* TITLE */}
      <h1
        style={{
          fontSize: "56px",
          fontWeight: "800",
          lineHeight: "1.2",
          marginBottom: "20px",
        }}
      >
        Compare Prices.
        <br />
        Optimize Carts.
        <br />
        <span style={{ color: "#3B82F6" }}>Save Money.</span>
      </h1>

      {/* DESCRIPTION */}
      <p
        style={{
          color: "#A1A1AA",
          fontSize: "18px",
          lineHeight: "1.6",
          marginBottom: "30px",
        }}
      >
        Real-time grocery price comparison across Blinkit, Zepto, Swiggy Instamart,
        BigBasket & JioMart. Our smart basket optimizer finds the cheapest way.
      </p>

      {/* SEARCH */}
     <form
  onSubmit={handleSearch}
  style={{
    display: "flex",
    gap: "10px",
    marginTop: "20px",
    width: "100%",
  }}
>
  {/* INPUT */}
  <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
    <Search
      style={{
        position: "absolute",
        left: "10px",
        top: "50%",
        transform: "translateY(-50%)",
        color: "#999",
      }}
    />

    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search milk, bread..."
      style={{
        width: "100%",
        padding: "12px 10px 12px 35px",
        borderRadius: "6px",
        border: "1px solid #ccc",
      }}
    />
  </div>

  {/* BUTTON */}
  <button
    type="submit"
    style={{
      padding: "12px 18px",
      background: "#2563EB",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      whiteSpace: "nowrap",   // ⭐ prevents text cutting
      flexShrink: 0,          // ⭐ prevents shrinking
      display: "flex",
      alignItems: "center",
      gap: "5px",
    }}
  >
    Compare <ArrowRight size={16} />
  </button>
</form>

    </div>
  </div>
</section>

      {/* FEATURES */}
      <section style={{ padding: "50px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "20px",
          }}
        >
          {FEATURES.map((f, i) => (
            <div
              key={i}
              style={{
                padding: "15px",
                border: "1px solid #ddd",
                borderRadius: "8px",
              }}
            >
              <f.icon style={{ color: "#2563EB", marginBottom: "10px" }} />
              <h3>{f.title}</h3>
              <p style={{ fontSize: "14px", color: "#555" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

       {/* ================= HOW IT WORKS (ADDED) ================= */}
   
{/* HOW IT WORKS SECTION */}
<section className="py-20 bg-white" id="how-it-works">
  <div className="max-w-6xl mx-auto px-6 lg:px-8">
    
    {/* Reduced section heading size */}
    <h2 className="text-center text-2xl md:text-3xl font-black tracking-tight text-[#0A0A0A] mb-16">
      How BuyWise Works
    </h2>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12">
      {[
        { 
          step: "01", 
          title: "Search your groceries", 
          desc: "Type what you need or paste your shopping list. We support text and multi-item search." 
        },
        { 
          step: "02", 
          title: "Compare across platforms", 
          desc: "See real-time prices, delivery times, fees, and availability across all 5 platforms side-by-side." 
        },
        { 
          step: "03", 
          title: "Optimize & checkout", 
          desc: "Our smart algorithm finds the cheapest combination. Deep links take you directly to the retailer app." 
        },
      ].map((s, i) => (
        <div key={i} className="relative flex flex-col items-start" style={{ minHeight: '140px' }}>
          
          {/* Reduced watermark size from 100px to 70px to stop overlapping */}
          <span className="text-[70px] font-black leading-none text-[#E6F0FF] absolute -top-8 -left-1 pointer-events-none select-none opacity-80">
            {s.step}
          </span>
          
          {/* Content layer with increased top padding to stay clear of the number */}
          <div className="relative pt-10">
            <h3 className="text-lg font-bold text-[#0A0A0A] mb-3 leading-tight">
              {s.title}
            </h3>
            <p className="text-[#525252] text-[14px] leading-relaxed max-w-[280px]">
              {s.desc}
            </p>
          </div>

        </div>
      ))}
    </div>
  </div>
</section>

      {/* CTA */}
     {/* CTA SECTION */}
<section className="py-16 bg-white" data-testid="cta-section">
  <div className="max-w-7xl mx-auto px-6 text-center">
    
    {/* Reduced from 42px to 32px for a cleaner look */}
    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#0A0A0A] mb-3">
      Start saving on groceries today
    </h2>

    {/* Reduced font size and tightened width */}
    <p className="text-[#525252] text-sm md:text-base mb-8 max-w-sm mx-auto leading-relaxed">
      Join thousands of smart shoppers who never overpay for groceries.
    </p>

    {/* Adjusted button padding and text size */}
    <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
      <button 
        onClick={() => navigate('/compare')}
        className="w-full sm:w-auto bg-[#0055FF] hover:bg-[#0044CC] text-white px-6 py-3 rounded-sm font-bold text-sm flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-lg shadow-blue-500/10"
      >
        Start Comparing <ArrowRight size={16} />
      </button>

      <button 
        onClick={() => navigate('/signup')}
        className="w-full sm:w-auto bg-[#F9FAFB] border border-[#E5E7EB] hover:bg-gray-100 text-[#0A0A0A] px-6 py-3 rounded-sm font-bold text-sm transition-all"
      >
        Create Account
      </button>
    </div>

  </div>
</section>

      {/* FOOTER */}
      <footer
        style={{
          textAlign: "center",
          padding: "20px",
          borderTop: "1px solid #ddd",
          fontSize: "14px",
          color: "#777",
        }}
      >
        BuyWise — Real-Time Price Comparison Platform
      </footer>

    </div>
    
  );
}