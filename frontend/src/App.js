import { useState, useMemo } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import api from "./api";
import "./App.css";

// Components from branches
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./HomePage";
import DealsPage from "./DealsPage";
import AboutPage from "./AboutPage";
import ComparePage from "./ComparePage";
import LoginPage from "./pages/LoginPage";
import CreateAccount from "./pages/CreateAccount";
import ProfilePage from "./pages/ProfilePage";
import { PLATFORM_META, COLORS, ACTIVE_PLATFORMS } from "./AppContent";

function mapItemToPlatform(item, bestDeal, bestUnitPrice, recommendedPlatform) {
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

  const isAvailable = item.isAvailable !== false && item.price !== null && item.price !== undefined && Number(item.price) > 0;
  const productName = item.product_name || item.name || (isAvailable ? "Product" : `Not available on ${meta.name}`);
  const price = isAvailable ? Number(item.price) : null;
  const delivery = isAvailable ? Number(item.delivery ?? 0) : null;
  const isBestDeal =
    isAvailable &&
    ((bestDeal?.platform?.toLowerCase() === platformKey &&
      (!item.search_term ||
        !bestDeal?.search_term ||
        item.search_term.toLowerCase() === bestDeal?.search_term.toLowerCase())) ||
      Boolean(item.is_best_deal));
  const isBestUnitPrice =
    isAvailable &&
    (bestUnitPrice?.platform?.toLowerCase() === platformKey ||
      Boolean(item.is_best_unit_price));
  const isAssignedStore =
    isAvailable &&
    (Boolean(item.is_assigned_store) ||
      (recommendedPlatform && recommendedPlatform.toLowerCase() === platformKey));
  const packageDisplay =
    item.package_display || (item.qty && item.unit ? `${item.qty} ${item.unit}` : "");
  const unitPriceDisplay =
    item.unit_price_display ||
    (item.unit_price ? `₹${item.unit_price}/${item.unit_price_unit || "unit"}` : "");

  const deliveryLabel = !isAvailable ? "—" : (delivery === 0 ? "Free delivery" : `₹${delivery} delivery`);
  const stockChip = !isAvailable ? "warn" : (platformKey === "blinkit" ? "good" : "neutral");
  const stockText = !isAvailable ? "Unavailable" : "In stock";
  const timeLabel = isAvailable && item.eta ? `${item.eta} min` : "—";
  const original = isAvailable ? Math.max(price, item.original ?? price) : null;

  return {
    ...meta,
    platform: platformKey,
    platformLabel: meta.name,
    product_name: productName,
    packageDisplay,
    unitPriceDisplay,
    isBestUnitPrice,
    isAssignedStore,
    isAvailable,
    price,
    original,
    discount: (isAvailable && original > price) ? Math.round(((original - price) / original) * 100) : 0,
    delivery,
    deliveryLabel,
    deliveryChip: !isAvailable ? "warn" : (delivery === 0 ? "good" : stockChip),
    time: timeLabel,
    stock: stockText,
    stockChip,
    best: isBestDeal,
    product_url: item.product_url || null,
    searchUrl: meta.searchBase,
    search_term: item.search_term,
  };
}

function getCompletePlatformsForTerm(searchTerm, foundItems = [], bestDeal = null, bestUnitPrice = null, recommendedPlatform = null) {
  const byPlat = {};
  (foundItems || []).forEach((item) => {
    if (item && item.platform) {
      const pKey = item.platform.toLowerCase().trim();
      if (ACTIVE_PLATFORMS.includes(pKey)) {
        byPlat[pKey] = item;
      }
    }
  });

  return ACTIVE_PLATFORMS.map((platKey) => {
    if (byPlat[platKey]) {
      return mapItemToPlatform(byPlat[platKey], bestDeal, bestUnitPrice, recommendedPlatform);
    }
    const meta = PLATFORM_META[platKey] || {
      id: platKey,
      name: platKey.charAt(0).toUpperCase() + platKey.slice(1),
      initial: platKey.slice(0, 2).toUpperCase(),
      searchBase: "",
    };
    return mapItemToPlatform(
      {
        platform: platKey,
        name: meta.name,
        product_name: `Not available on ${meta.name}`,
        price: null,
        delivery: null,
        isAvailable: false,
        search_term: searchTerm,
      },
      null,
      null,
      null
    );
  });
}

function MainApp() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const navigate = useNavigate();

  const handleOcrItemsSelected = (items) => {
    if (!items || items.length === 0) return;
    const query = items.join(", ");
    setInput(query);
    navigate("/compare");
    handleCompare(query);
  };

  // OCR image upload (with node-server proxy and direct fallback)
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setOcrLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      let extracted = [];
      const res = await api.post("/products/parse-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      extracted = res.data?.items || [];

      if (extracted.length === 0) {
        setError("No product names could be detected in this image. Please enter them manually.");
      } else {
        const query = extracted.join(", ");
        setInput(query);
        handleCompare(query);
      }
    } catch (err) {
      console.error("OCR error:", err);
      const msg = err.response?.data?.message || err.message || "Unable to process image. Please check that the backend is running.";
      setError(msg);
    } finally {
      setLoading(false);
      setOcrLoading(false);
    }
  };

  // Compare handler (routed via Node.js API Gateway)
  const handleCompare = async (queryOverride) => {
    const query = (queryOverride ?? input).trim();
    if (!query) {
      setError("Please enter one or more items separated by commas.");
      return;
    }

    setInput(query);
    setError("");
    setLoading(true);
    setResult(null);

    try {
      const items = query
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const pincode = localStorage.getItem("buywise_pincode") || "560001";
      const res = await api.post("/products/compare", { items, pincode });
      const resData = res.data?.data || res.data;

      if (resData?.error || resData?.message) {
        setError(resData.error || resData.message || "No results found.");
        setResult(null);
      } else {
        setResult(resData);
      }
    } catch (err) {
      console.error("Compare error:", err);
      const msg = err.response?.data?.message || err.message || "Unable to fetch comparison. Please verify that the backend is running.";
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
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
    const recPlatform = result?.recommended_platform || result?.recommended_checkout?.platforms_used?.[0];
    const singleTerm = result?.items?.[0] || input || "product";
    return getCompletePlatformsForTerm(singleTerm, result?.all, result?.best, result?.best_unit_price, recPlatform);
  }, [result, input]);

  const maxTotal = useMemo(() => {
    const validPrices = platforms
      .filter((item) => item.isAvailable && item.price !== null)
      .map((item) => item.price + (item.delivery ?? 0));
    return validPrices.length > 0 ? Math.max(...validPrices) : 100;
  }, [platforms]);

  // Multi-product detection & separation
  const products = useMemo(() => {
    if (!result) return [];

    // If backend provided by_product mapping
    if (result.by_product && Object.keys(result.by_product).length > 0) {
      return Object.entries(result.by_product).map(([term, data]) => {
        const prodPlatforms = getCompletePlatformsForTerm(
          term,
          data.all,
          data.best,
          data.best_unit_price,
          data.recommended_platform
        );
        const validPrices = prodPlatforms
          .filter((p) => p.isAvailable && p.price !== null)
          .map((p) => p.price + (p.delivery ?? 0));
        const prodMaxTotal = validPrices.length > 0 ? Math.max(...validPrices) : 100;

        return {
          term,
          best: data.best,
          best_unit_price: data.best_unit_price,
          platforms: prodPlatforms,
          maxTotal: prodMaxTotal,
          all: data.all || [],
          cache_info: data.cache_info || result.cache_info || null,
          recommended_allocation: data.recommended_allocation || null,
          recommended_platform: data.recommended_platform || null,
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
          const prodPlatforms = getCompletePlatformsForTerm(term, items, best, bestUnit);
          const validPrices = prodPlatforms
            .filter((p) => p.isAvailable && p.price !== null)
            .map((p) => p.price + (p.delivery ?? 0));
          const prodMaxTotal = validPrices.length > 0 ? Math.max(...validPrices) : 100;

          return {
            term,
            best,
            best_unit_price: bestUnit,
            platforms: prodPlatforms,
            maxTotal: prodMaxTotal,
            all: items,
            cache_info: result.cache_info || null,
            recommended_allocation: null,
            recommended_platform: null,
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
        <Route
          path="/"
          element={
            <HomePage
              onNavigate={handleNavigate}
              onOpenOcrModal={() => setIsOcrOpen(true)}
              onCloseOcrModal={() => setIsOcrOpen(false)}
              onToggleOcrModal={() => setIsOcrOpen((prev) => !prev)}
              isOcrOpen={isOcrOpen}
              onOcrItemsSelected={handleOcrItemsSelected}
            />
          }
        />
        <Route
          path="/home"
          element={
            <HomePage
              onNavigate={handleNavigate}
              onOpenOcrModal={() => setIsOcrOpen(true)}
              onCloseOcrModal={() => setIsOcrOpen(false)}
              onToggleOcrModal={() => setIsOcrOpen((prev) => !prev)}
              isOcrOpen={isOcrOpen}
              onOcrItemsSelected={handleOcrItemsSelected}
            />
          }
        />
        <Route
          path="/compare"
          element={
            <ComparePage
              input={input}
              setInput={setInput}
              handleCompare={handleCompare}
              handleImageUpload={handleImageUpload}
              onOpenOcrModal={() => setIsOcrOpen(true)}
              onCloseOcrModal={() => setIsOcrOpen(false)}
              onToggleOcrModal={() => setIsOcrOpen((prev) => !prev)}
              isOcrOpen={isOcrOpen}
              onOcrItemsSelected={handleOcrItemsSelected}
              ocrLoading={ocrLoading}
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
        <Route path="/deals" element={<DealsPage onNavigate={handleNavigate} />} />
        <Route path="/about" element={<AboutPage onNavigate={handleNavigate} />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<CreateAccount />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
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
