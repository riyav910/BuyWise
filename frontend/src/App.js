import { useState, useMemo } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import axios from "axios";
import "./App.css";

// Components from branches
import Navbar from "./components/Navbar";
import HomePage from "./HomePage";
import DealsPage from "./DealsPage";
import AboutPage from "./AboutPage";
import ComparePage from "./ComparePage";
import LoginPage from "./pages/LoginPage";
import CreateAccount from "./pages/CreateAccount";
import { PLATFORM_META, COLORS } from "./AppContent";

function mapItemToPlatform(item, bestDeal, bestUnitPrice) {
  const platformKey = (item.platform || "").toLowerCase();
  const meta = PLATFORM_META[platformKey] || {
    id: platformKey || "unknown",
    name: item.platform || "Platform",
    initial: (item.platform || "?").slice(0, 2).toUpperCase(),
    color: COLORS.muted,
    bg: COLORS.bg,
    btnColor: COLORS.muted,
    searchBase: "",
  };

  const productName = item.product_name || item.name || "Product";
  const price = item.price ?? 0;
  const delivery = item.delivery ?? 0;
  const isBestDeal = (bestDeal?.platform?.toLowerCase() === platformKey && (!item.search_term || !bestDeal?.search_term || item.search_term.toLowerCase() === bestDeal?.search_term.toLowerCase())) || Boolean(item.is_best_deal);
  const isBestUnitPrice = (bestUnitPrice?.platform?.toLowerCase() === platformKey) || Boolean(item.is_best_unit_price);
  const packageDisplay = item.package_display || (item.qty && item.unit ? `${item.qty} ${item.unit}` : "");
  const unitPriceDisplay = item.unit_price_display || (item.unit_price ? `₹${item.unit_price}/${item.unit_price_unit || 'unit'}` : "");

  const deliveryLabel = delivery === 0 ? "Free delivery" : `₹${delivery} delivery`;
  const stockChip = platformKey === "blinkit" ? "good" : platformKey === "swiggy" ? "warn" : "neutral";
  const stockText = platformKey === "swiggy" ? "Low stock" : "In stock";
  const timeLabel = item.eta ? `${item.eta} min` : "—";
  const original = Math.max(price, item.original ?? price);

  return {
    ...meta,
    platformLabel: meta.name,
    product_name: productName,
    packageDisplay,
    unitPriceDisplay,
    isBestUnitPrice,
    price,
    original,
    discount: original > price ? Math.round(((original - price) / original) * 100) : 0,
    delivery,
    deliveryLabel,
    deliveryChip: delivery === 0 ? "good" : stockChip,
    time: timeLabel,
    stock: stockText,
    best: isBestDeal,
    product_url: item.product_url || null,
    searchUrl: meta.searchBase,
    search_term: item.search_term,
  };
}

function MainApp() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // OCR image upload (from local work)
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://127.0.0.1:8000/ocr-compare", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = res.data;
      if (data.error || data.message) {
        setError(data.error || data.message || "No results found from receipt.");
        setResult(null);
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to process image. Is the backend running?");
      setResult(null);
    }

    setLoading(false);
  };

  // Compare handler (from frontend-update)
  const handleCompare = async (queryOverride) => {
    const query = (queryOverride ?? input).trim();
    if (!query) {
      setError("Please enter one or more items separated by commas.");
      return;
    }

    setInput(query);
    setError("");
    setLoading(true);

    try {
      const items = query.split(",").map((item) => item.trim()).filter(Boolean);
      const res = await axios.post("http://127.0.0.1:8000/compare", { items });
      const data = res.data;
      if (data.error || data.message) {
        setError(data.error || data.message || "No results found.");
        setResult(null);
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to fetch comparison. Is the backend running?");
      setResult(null);
    }

    setLoading(false);
  };

  const handleNavigate = (target, query) => {
    if (target === "compare" || target === "search") {
      navigate("/compare");
      if (query?.trim()) {
        handleCompare(query);
      }
      return;
    }
    if (target === "deals") {
      navigate("/deals");
      return;
    }
    if (target === "home") {
      navigate("/");
    }
  };

  // Single-product or flat platforms list fallback
  const platforms = useMemo(() => {
    return (
      result?.all?.map((item) =>
        mapItemToPlatform(item, result?.best, result?.best_unit_price)
      ) || []
    );
  }, [result]);

  const maxTotal = Math.max(1, ...platforms.map((item) => item.price + item.delivery));

  // Multi-product detection & separation
  const products = useMemo(() => {
    if (!result) return [];

    // If backend provided by_product mapping
    if (result.by_product && Object.keys(result.by_product).length > 0) {
      return Object.entries(result.by_product).map(([term, data]) => {
        const prodPlatforms = (data.all || []).map((item) =>
          mapItemToPlatform(item, data.best, data.best_unit_price)
        );
        const prodMaxTotal = Math.max(1, ...prodPlatforms.map((p) => p.price + p.delivery));
        return {
          term,
          best: data.best,
          best_unit_price: data.best_unit_price,
          platforms: prodPlatforms,
          maxTotal: prodMaxTotal,
          all: data.all || [],
        };
      });
    }

    // Fallback: group result.all by search_term
    if (result.all && result.all.length > 0) {
      const termMap = {};
      result.all.forEach((item) => {
        const t = (item.search_term || "Product").trim();
        if (!termMap[t]) termMap[t] = [];
        termMap[t].push(item);
      });

      const keys = Object.keys(termMap);
      if (keys.length > 1) {
        return keys.map((term) => {
          const items = termMap[term];
          const best = items.find((i) => i.is_best_deal) || items[0];
          const bestUnit = items.find((i) => i.is_best_unit_price) || null;
          const prodPlatforms = items.map((item) =>
            mapItemToPlatform(item, best, bestUnit)
          );
          const prodMaxTotal = Math.max(1, ...prodPlatforms.map((p) => p.price + p.delivery));
          return {
            term,
            best,
            best_unit_price: bestUnit,
            platforms: prodPlatforms,
            maxTotal: prodMaxTotal,
            all: items,
          };
        });
      }
    }

    return [];
  }, [result]);

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage onNavigate={handleNavigate} />} />
        <Route
          path="/compare"
          element={
            <ComparePage
              input={input}
              setInput={setInput}
              handleCompare={handleCompare}
              handleImageUpload={handleImageUpload}
              loading={loading}
              error={error}
              result={result}
              platforms={platforms}
              maxTotal={maxTotal}
              products={products}
              onNavigate={handleNavigate}
            />
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<CreateAccount />} />
        <Route path="/deals" element={<DealsPage onNavigate={handleNavigate} />} />
        <Route path="/about" element={<AboutPage onNavigate={handleNavigate} />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  );
}
