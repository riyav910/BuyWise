import { useState } from "react";
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

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/parse-image",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("OCR items:", res.data.items);
      setInput(res.data.items.join(", "));
    } catch (err) {
      console.error(err);
      alert("OCR failed");
    }
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

  // Platform mapping (from frontend-update)
  const platforms =
    result?.all?.map((item) => {
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
      const isBestDeal = result?.best?.platform?.toLowerCase() === platformKey;
      const isBestUnitPrice = (result?.best_unit_price?.platform?.toLowerCase() === platformKey) || Boolean(item.is_best_unit_price);
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
      };
    }) || [];


  const maxTotal = Math.max(1, ...platforms.map((item) => item.price + item.delivery));

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
