import { useState } from "react";
import { Badge, relatedProducts, PlatformCard, BarRow, RelatedCard } from "./AppContent";
import ListUploadModal from "./components/ListUploadModal";

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

function SmartCartOptimizerCard({ optimized, products }) {
  if (!optimized) return null;

  const rec = optimized.recommended_checkout;
  const single = optimized.single_cart;
  const split = optimized.split_cart;

  if (!rec && !split) return null;

  // Extract totals with clean fallback
  const totalCost = rec ? rec.total_cost : (split?.total_cost ?? split?.total_cost_inr ?? 0);
  const itemsSubtotal = rec ? rec.items_subtotal : (split?.items_subtotal ?? split?.items_cost_inr ?? 0);
  const deliveryTotal = rec ? rec.delivery_total : (split?.delivery_total ?? split?.delivery_cost_inr ?? 0);
  const handlingTotal = rec ? (rec.handling_total ?? 0) : (split?.handling_total ?? 0);
  const mode = rec?.mode || (split?.platforms?.length > 1 || split?.platforms_used?.length > 1 ? "split_store" : "single_store");
  const isSplit = mode === "split_store";
  const platformsUsed = rec ? (rec.platforms_used || []) : (split?.platforms || split?.platforms_used || []);
  const savings = rec ? (rec.savings_vs_alternative ?? 0) : Math.max(0, (single?.total_cost ?? single?.total_cost_inr ?? 0) - totalCost);
  const reason = rec?.reason || (
    savings > 0
      ? `Splitting order across ${platformsUsed.join(" & ")} saves ₹${Number(savings).toFixed(2)} vs single store!`
      : `A single-store order on ${platformsUsed[0] || "one platform"} delivers the best checkout value.`
  );

  // Allocation items
  let allocationItems = [];
  if (rec?.allocation) {
    allocationItems = Object.entries(rec.allocation).map(([term, data]) => ({
      searchTerm: term,
      name: data.product_name || term,
      platform: data.platform,
      price: data.product_price,
      packagesNeeded: data.packages_needed || 1,
      totalCost: data.total_item_cost,
      packageDisplay: data.package_display,
      unitPriceDisplay: data.unit_price_display,
      productUrl: data.product_url,
    }));
  } else if (split?.items) {
    allocationItems = split.items.map((item) => ({
      searchTerm: item.search_term || item.product_name,
      name: item.product_name || item.search_term,
      platform: item.platform,
      price: item.price,
      packagesNeeded: item.packages_needed || 1,
      totalCost: item.price * (item.packages_needed || 1),
      packageDisplay: item.package_display,
      unitPriceDisplay: item.unit_price_display,
      productUrl: item.product_url,
    }));
  }

  // Platform breakdown items
  const breakdownEntries = rec?.platform_breakdown ? Object.entries(rec.platform_breakdown) : [];

  return (
    <div className="app-optimizer-card fade-up">
      {/* HEADER */}
      <div className="app-optimizer-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
            <span className="app-optimizer-badge">⚡ Smart Cart Optimizer</span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: "999px",
                background: isSplit ? "#eff6ff" : "#f0fdf4",
                color: isSplit ? "#1d4ed8" : "#15803d",
                border: `1px solid ${isSplit ? "#bfdbfe" : "#bbf7d0"}`,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {isSplit ? `⚡ Split Order (${platformsUsed.length} Stores)` : `🏪 Single-Store (${platformsUsed[0]?.toUpperCase() || "1 STORE"})`}
            </span>
          </div>
          <h2 className="app-optimizer-title">
            RECOMMENDED CHECKOUT: ₹{Number(totalCost).toFixed(2)}
          </h2>
          <p className="app-optimizer-subtitle">
            Optimal allocation minimizing complete checkout cost (items + delivery + handling).
          </p>
        </div>

        <div className="app-optimizer-total-wrap">
          <div className="app-optimizer-total-label">Final Checkout Total</div>
          <div className="app-optimizer-total-value">₹{Number(totalCost).toFixed(2)}</div>
          <div style={{ fontSize: "12px", color: "#166534", marginTop: "2px" }}>
            Items: ₹{Number(itemsSubtotal).toFixed(2)} + Del: ₹{Number(deliveryTotal).toFixed(2)}
            {handlingTotal > 0 && ` + Fee: ₹${Number(handlingTotal).toFixed(2)}`}
          </div>
        </div>
      </div>

      {/* SAVINGS / STRATEGIC BANNER */}
      {savings > 0 ? (
        <div className="app-optimizer-savings-banner" style={{ marginBottom: "20px" }}>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 800 }}>
              🎉 Save ₹{Number(savings).toFixed(2)} with Recommended Allocation
            </div>
            <div style={{ fontSize: "13px", opacity: 0.95, marginTop: "2px" }}>
              {reason}
            </div>
          </div>
          <Badge variant="accent">Best Allocation Deal</Badge>
        </div>
      ) : (
        <div className="app-optimizer-savings-banner" style={{ background: "#166534", marginBottom: "20px" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700 }}>
              ✅ Optimal Checkout Total
            </div>
            <div style={{ fontSize: "13px", opacity: 0.95, marginTop: "2px" }}>
              {reason}
            </div>
          </div>
          <Badge variant="success">Consolidation Winner</Badge>
        </div>
      )}

      {/* ALTERNATIVE COMPARISON CHIPS */}
      {(single?.total_cost || split?.total_cost) && (
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "20px",
            background: "#ffffff",
            padding: "12px 16px",
            borderRadius: "14px",
            border: "1px solid #bbf7d0",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
            Compare Options:
          </div>
          <div
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              background: "#dcfce7",
              border: "1px solid #86efac",
              fontSize: "13px",
              fontWeight: 700,
              color: "#166534",
            }}
          >
            🏆 Recommended: ₹{Number(totalCost).toFixed(2)}
          </div>
          {single && (
            <div
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                background: !isSplit ? "#dcfce7" : "#f8fafc",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
                color: "#334155",
              }}
            >
              🏪 Best Single-Store ({single.platform?.toUpperCase()}): <strong>₹{Number(single.total_cost ?? single.total_cost_inr).toFixed(2)}</strong>
            </div>
          )}
          {split && split.total_cost && (
            <div
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                background: isSplit ? "#dcfce7" : "#f8fafc",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
                color: "#334155",
              }}
            >
              ⚡ Split Cart ({split.platforms ? split.platforms.join(" + ").toUpperCase() : "MULTI"}): <strong>₹{Number(split.total_cost ?? split.total_cost_inr).toFixed(2)}</strong>
            </div>
          )}
        </div>
      )}

      {/* STORE-BY-STORE BREAKDOWN */}
      {breakdownEntries.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#166534", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Platform Cost Breakdown
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
            {breakdownEntries.map(([pName, pData]) => (
              <div
                key={`breakdown-${pName}`}
                style={{
                  background: "#ffffff",
                  border: "1px solid #bbf7d0",
                  borderRadius: "12px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontWeight: 800, textTransform: "capitalize", color: "#0f172a", fontSize: "14px" }}>
                    {pName}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#16a34a", background: "#f0fdf4", padding: "2px 6px", borderRadius: "6px" }}>
                    {pData.items_count} item{pData.items_count > 1 ? "s" : ""}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#475569", lineHeight: "1.6" }}>
                  <div>Items: <strong>₹{Number(pData.items_subtotal).toFixed(2)}</strong></div>
                  <div>
                    Delivery: <strong>{pData.delivery_fee === 0 ? "FREE" : `₹${Number(pData.delivery_fee).toFixed(2)}`}</strong>
                    {pData.free_delivery_applied && <span style={{ color: "#16a34a", marginLeft: "4px" }}>🟢</span>}
                  </div>
                  {pData.amount_needed_for_free_delivery > 0 && (
                    <div style={{ fontSize: "11px", color: "#d97706" }}>
                      (Add ₹{Number(pData.amount_needed_for_free_delivery).toFixed(2)} for free delivery)
                    </div>
                  )}
                  {pData.handling_fee > 0 && <div>Handling: <strong>₹{Number(pData.handling_fee).toFixed(2)}</strong></div>}
                </div>
                <div style={{ marginTop: "8px", paddingTop: "6px", borderTop: "1px dashed #e2e8f0", display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "13px", color: "#15803d" }}>
                  <span>Store Total:</span>
                  <span>₹{Number(pData.total).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PRODUCT ALLOCATION GRID */}
      <div>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#166534", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Assigned Product Allocation ({allocationItems.length} items)
        </div>
        <div className="app-optimizer-items-grid" style={{ marginBottom: 0 }}>
          {allocationItems.map((item, idx) => (
            <div key={`alloc-${idx}`} className="app-optimizer-item-row">
              <div className="app-optimizer-item-info">
                <span className="app-optimizer-item-name">{item.name}</span>
                <span className="app-optimizer-item-platform">
                  Assigned Store: <strong style={{ textTransform: "capitalize", color: "#16a34a" }}>{item.platform}</strong>
                </span>
                {item.packageDisplay && (
                  <span style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    Qty: {item.packagesNeeded > 1 ? `${item.packagesNeeded} x ` : ""}{item.packageDisplay}
                    {item.unitPriceDisplay && ` (${item.unitPriceDisplay})`}
                  </span>
                )}
              </div>
              <div style={{ textAlign: "right", minWidth: "70px" }}>
                <div style={{ fontWeight: 800, fontSize: "16px", color: "#0f172a" }}>
                  ₹{Number(item.totalCost ?? item.price).toFixed(2)}
                </div>
                {item.productUrl && (
                  <a
                    href={item.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "12px", color: "#2563eb", textDecoration: "underline", display: "inline-block", marginTop: "2px" }}
                  >
                    View ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductSection({ prod, index, totalCount }) {
  const emoji = getProductEmoji(prod.term);
  const bestOrderTotal = prod.best ? prod.best.price + (prod.best.delivery ?? 0) : null;

  return (
    <div className="app-product-section fade-up" id={`product-${index}`}>
      <div className="app-product-section-header">
        <div className="app-product-title-row">
          <div className="app-product-emoji-badge">{emoji}</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <h2 className="app-product-title">{prod.term}</h2>
              <span className="app-product-counter-tag">
                {index + 1} of {totalCount}
              </span>
              {prod.recommended_platform && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: "999px",
                    background: "#ecfdf5",
                    color: "#0f766e",
                    border: "1px solid #99f6e4",
                  }}
                  title={`Cart Optimizer assigned ${prod.recommended_platform} for lowest overall order checkout`}
                >
                  <span>🎯 Assigned Store:</span>
                  <strong style={{ textTransform: "capitalize" }}>{prod.recommended_platform}</strong>
                </span>
              )}
              {prod.cache_info && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: "999px",
                    background: prod.cache_info.is_cached ? "#f0fdf4" : "#f1f5f9",
                    color: prod.cache_info.is_cached ? "#15803d" : "#475569",
                    border: `1px solid ${prod.cache_info.is_cached ? "#bbf7d0" : "#e2e8f0"}`,
                  }}
                  title={
                    prod.cache_info.is_cached
                      ? `Served from BuyWise cache (${prod.cache_info.tier || "catalog"} tier, TTL: ${prod.cache_info.ttl || 120}s)`
                      : "Scraped live from quick-commerce stores"
                  }
                >
                  <span>{prod.cache_info.is_cached ? "⚡" : "🟢"}</span>
                  <span>{prod.cache_info.message || (prod.cache_info.is_cached ? `Updated ${prod.cache_info.age_seconds}s ago` : "Updated just now")}</span>
                </span>
              )}
            </div>
            <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
              Compared across {prod.platforms?.length || 0} quick-commerce platforms
            </div>
          </div>
        </div>

        {prod.best && (
          <div style={{ textAlign: "right" }}>
            <div className="app-highlight-label" style={{ color: "#166534" }}>Cheapest Item Price</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", justifyContent: "flex-end" }}>
              <span style={{ fontSize: "16px", fontWeight: 700, textTransform: "capitalize", color: "#15803d" }}>
                {prod.best.platform}
              </span>
              <span style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                ₹{bestOrderTotal}
              </span>
            </div>
            {prod.best.product_url && (
              <a
                href={prod.best.product_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#2563eb", textDecoration: "underline", fontSize: "12px", display: "inline-block", marginTop: "2px" }}
              >
                View on {prod.best.platform} ↗
              </a>
            )}
          </div>
        )}
      </div>

      {prod.best_unit_price && (
        <div style={{ marginBottom: "16px", fontSize: "13px", color: "#475569", background: "#f8fafc", padding: "8px 14px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <span>
            Lowest unit rate: <strong style={{ color: "#16a34a" }}>{prod.best_unit_price.unit_price_display}</strong> on <strong style={{ textTransform: "capitalize" }}>{prod.best_unit_price.platform}</strong>
          </span>
          {prod.best_unit_price.product_url && (
            <a href={prod.best_unit_price.product_url} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "underline", fontSize: "12px" }}>
              View unit deal ↗
            </a>
          )}
        </div>
      )}

      {/* Platform comparison cards for this product */}
      <div className="app-platforms-grid" style={{ marginBottom: "20px" }}>
        {prod.platforms && prod.platforms.length > 0 ? (
          prod.platforms.map((item, pIdx) => (
            <PlatformCard key={`${item.id}-${pIdx}`} item={item} index={pIdx} />
          ))
        ) : (
          <div className="app-card">No platform options found for {prod.term}.</div>
        )}
      </div>

      {/* Bar chart comparison for this product */}
      {prod.platforms && prod.platforms.length > 0 && (
        <div className="app-bar-card" style={{ marginBottom: 0, padding: "16px 20px" }}>
          <div className="app-bar-card-header" style={{ marginBottom: "12px" }}>
            <div>
              <div className="app-bar-card-title" style={{ fontSize: "14px" }}>
                Cost comparison: {prod.term}
              </div>
              <div className="app-bar-card-subtitle" style={{ fontSize: "12px" }}>
                Price + delivery charge
              </div>
            </div>
            <div className="app-bar-card-meta">{prod.platforms.length} platforms</div>
          </div>
          {prod.platforms
            .slice()
            .sort((a, b) => (a.price + a.delivery) - (b.price + b.delivery))
            .map((item) => (
              <BarRow
                key={`bar-${item.id}-${prod.term}`}
                label={`${item.name} · ₹${item.price + item.delivery}`}
                price={item.price + item.delivery}
                maxPrice={prod.maxTotal}
                color={item.color}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export default function ComparePage({
  input,
  setInput,
  handleCompare,
  handleImageUpload,
  onOpenOcrModal,
  onCloseOcrModal,
  onToggleOcrModal,
  isOcrOpen,
  onOcrItemsSelected,
  loading,
  error,
  result,
  platforms,
  maxTotal,
  products = [],
  onNavigate,
}) {
  const [activeTab, setActiveTab] = useState("all");

  const isMulti = products && products.length > 1;

  return (
    <div className="app-page">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-search-wrap">
            <span className="app-search-icon">🔍</span>
            <input
              className="app-search-input"
              placeholder="Enter product names separated by commas (e.g. milk, bread, butter)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCompare();
              }}
            />
            <button
              type="button"
              className={`compare-search-cam-btn ${isOcrOpen ? "active" : ""}`}
              onClick={() => {
                if (onToggleOcrModal) onToggleOcrModal();
                else if (onOpenOcrModal) onOpenOcrModal();
              }}
              title="Upload or scan a photo of your shopping list"
              aria-label="Upload shopping list photo"
            >
              📷
            </button>
          </div>
          {(onOpenOcrModal || onToggleOcrModal) ? (
            <button
              type="button"
              className={`compare-ocr-scan-btn ${isOcrOpen ? "active" : ""}`}
              onClick={() => {
                if (onToggleOcrModal) onToggleOcrModal();
                else if (onOpenOcrModal) onOpenOcrModal();
              }}
              title="Upload and scan a photo of your typed shopping list"
            >
              <span>📷 {isOcrOpen ? "Close Scanner" : "Scan List Photo"}</span>
            </button>
          ) : (
            handleImageUpload && (
              <input type="file" accept="image/*" onChange={handleImageUpload} />
            )
          )}
          <button className="app-button app-button-primary" onClick={() => handleCompare()}>
            {loading ? "Comparing..." : "Compare"}
          </button>
        </div>

        {/* Upload panel drops down just below the searchbar in the header */}
        {isOcrOpen && (
          <div className="compare-ocr-dropdown-wrap">
            <div className="compare-ocr-dropdown-inner">
              <ListUploadModal
                isOpen={isOcrOpen}
                onClose={onCloseOcrModal}
                onItemsSelected={onOcrItemsSelected}
                belowHeader={true}
              />
            </div>
          </div>
        )}
      </header>

      <div className="app-hero-strip">
        Fast product comparison across Blinkit, Zepto, BigBasket and JioMart — powered by BuyWise.
      </div>

      <main className="app-main">
        <section className="app-product-hero fade-up">
          <div className="app-prod-emoji">🛍️</div>
          <div>
            <h1 className="app-hero-title">Compare grocery prices instantly</h1>
            <p className="app-hero-copy">
              Enter product names separated by commas (e.g., <strong>milk, bread, eggs</strong>) or{" "}
              {(onOpenOcrModal || onToggleOcrModal) && (
                <button
                  type="button"
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    if (onOpenOcrModal) onOpenOcrModal();
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#16a34a",
                    textDecoration: "underline",
                    cursor: "pointer",
                    padding: 0,
                    fontWeight: 600,
                    font: "inherit",
                  }}
                >
                  upload a photo of your list
                </button>
              )}
              {" "}to extract and compare all items in parallel across Blinkit, Zepto, BigBasket, and JioMart.
            </p>
            <div className="app-hero-badges">
              <Badge variant="info">Parallel extraction</Badge>
              <Badge variant="success">Per-product breakdown</Badge>
              <Badge variant="accent">Smart split cart</Badge>
            </div>
          </div>
        </section>

        {error && <div className="app-alert">{error}</div>}

        {result ? (
          <>
            {isMulti ? (
              /* ================= MULTI-PRODUCT VIEW ================= */
              <div>
                {/* Tab switcher for multiple products */}
                <div className="app-product-tabs-wrap fade-up">
                  <button
                    className={`app-product-tab ${activeTab === "all" ? "app-product-tab--active" : ""}`}
                    onClick={() => setActiveTab("all")}
                  >
                    <span>📋 All Products</span>
                    <span className="app-product-tab-pill">{products.length}</span>
                  </button>

                  {result.optimized && (result.optimized.recommended_checkout || result.optimized.split_cart) && (
                    <button
                      className={`app-product-tab ${activeTab === "optimizer" ? "app-product-tab--active" : ""}`}
                      onClick={() => setActiveTab("optimizer")}
                    >
                      <span>⚡ Smart Cart</span>
                      <span className="app-product-tab-pill">
                        ₹{Number(result.optimized.recommended_checkout?.total_cost ?? result.optimized.split_cart?.total_cost ?? result.optimized.split_cart?.total_cost_inr ?? 0).toFixed(2)}
                      </span>
                    </button>
                  )}

                  {products.map((prod, idx) => {
                    const emoji = getProductEmoji(prod.term);
                    const bestPrice = prod.best ? `₹${prod.best.price + (prod.best.delivery ?? 0)}` : "";
                    return (
                      <button
                        key={`tab-${idx}`}
                        className={`app-product-tab ${activeTab === prod.term ? "app-product-tab--active" : ""}`}
                        onClick={() => setActiveTab(prod.term)}
                      >
                        <span>{emoji} {prod.term}</span>
                        {bestPrice && <span className="app-product-tab-pill">{bestPrice}</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Content based on active tab */}
                {activeTab === "optimizer" && (
                  <SmartCartOptimizerCard optimized={result.optimized} products={products} />
                )}

                {activeTab === "all" && (
                  <div>
                    {/* Render Smart Cart split card preview at the top of all items */}
                    <SmartCartOptimizerCard optimized={result.optimized} products={products} />

                    <div className="app-section-label" style={{ marginTop: "16px" }}>
                      Individual Product Comparisons ({products.length} Items)
                    </div>

                    {/* Render each product separately in its own dedicated section */}
                    {products.map((prod, index) => (
                      <ProductSection
                        key={`section-${prod.term}-${index}`}
                        prod={prod}
                        index={index}
                        totalCount={products.length}
                      />
                    ))}
                  </div>
                )}

                {activeTab !== "all" && activeTab !== "optimizer" && (
                  <div>
                    {products
                      .filter((p) => p.term.toLowerCase() === activeTab.toLowerCase())
                      .map((prod, index) => (
                        <ProductSection
                          key={`single-focus-${prod.term}`}
                          prod={prod}
                          index={products.findIndex((p) => p.term.toLowerCase() === activeTab.toLowerCase())}
                          totalCount={products.length}
                        />
                      ))}
                  </div>
                )}
              </div>
            ) : (
              /* ================= SINGLE PRODUCT VIEW ================= */
              <>
                <div className="app-highlight-panel fade-up">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                      <div className="app-highlight-label" style={{ marginBottom: 0 }}>Best order deal</div>
                      {result.recommended_platform && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "999px",
                            background: "#ecfdf5",
                            color: "#0f766e",
                            border: "1px solid #99f6e4",
                          }}
                        >
                          <span>🎯 Assigned:</span>
                          <strong style={{ textTransform: "capitalize" }}>{result.recommended_platform}</strong>
                        </span>
                      )}
                      {result.cache_info && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "999px",
                            background: result.cache_info.is_cached ? "#f0fdf4" : "#f1f5f9",
                            color: result.cache_info.is_cached ? "#15803d" : "#475569",
                            border: `1px solid ${result.cache_info.is_cached ? "#bbf7d0" : "#e2e8f0"}`,
                          }}
                        >
                          <span>{result.cache_info.is_cached ? "⚡" : "🟢"}</span>
                          <span>{result.cache_info.message || (result.cache_info.is_cached ? `Updated ${result.cache_info.age_seconds}s ago` : "Updated just now")}</span>
                        </span>
                      )}
                    </div>
                    <div className="app-highlight-value">{result.best?.platform || "No valid result"}</div>
                    {result.best?.product_url && (
                      <div style={{ marginTop: "4px" }}>
                        <a
                          href={result.best.product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#2563eb", textDecoration: "underline", fontSize: "13px" }}
                        >
                          View on {result.best.platform} ↗
                        </a>
                      </div>
                    )}
                    {result.best_unit_price && (
                      <div className="app-highlight-meta" style={{ marginTop: "6px" }}>
                        Lowest unit rate: <strong style={{ color: "#16a34a" }}>{result.best_unit_price.unit_price_display}</strong> on <strong style={{ textTransform: "capitalize" }}>{result.best_unit_price.platform}</strong>
                        {result.best_unit_price.product_url && (
                          <span style={{ marginLeft: "8px" }}>
                            · <a href={result.best_unit_price.product_url} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "underline" }}>View product ↗</a>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="app-highlight-right">
                    <div className="app-highlight-meta">Compared {result.all?.length || 0} offers</div>
                    <div className="app-highlight-total">{result.best ? `₹${result.best.price + (result.best.delivery ?? 0)}` : "—"}</div>
                  </div>
                </div>

                {result.optimized?.recommended_checkout && (
                  <div style={{ marginTop: "20px" }}>
                    <SmartCartOptimizerCard optimized={result.optimized} products={[{ term: input || "item" }]} />
                  </div>
                )}

                <div className="app-section-label">Platform comparison</div>
                <div className="app-platforms-grid">
                  {platforms.length > 0 ? (
                    platforms.map((item, index) => <PlatformCard key={`${item.id}-${index}`} item={item} index={index} />)
                  ) : (
                    <div className="app-card">No platform results available.</div>
                  )}
                </div>

                <div className="app-bar-card fade-up">
                  <div className="app-bar-card-header">
                    <div>
                      <div className="app-bar-card-title">Total cost comparison</div>
                      <div className="app-bar-card-subtitle">Based on final price + delivery</div>
                    </div>
                    <div className="app-bar-card-meta">{platforms.length} platforms compared</div>
                  </div>
                  {platforms
                    .slice()
                    .sort((a, b) => (a.price + a.delivery) - (b.price + b.delivery))
                    .map((item) => (
                      <BarRow
                        key={`row-${item.id}`}
                        label={`${item.name} · ₹${item.price + item.delivery}`}
                        price={item.price + item.delivery}
                        maxPrice={maxTotal}
                        color={item.color}
                      />
                    ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="app-card app-card-empty fade-up">
            <div className="app-card-title">Ready to compare?</div>
            <p className="app-card-copy">
              Enter one or more items separated by commas, like <strong>milk, bread, eggs</strong>, then click Compare to load the latest parallel price comparison across platforms.
            </p>
          </div>
        )}

        <div className="app-section-label">You might also compare</div>
        <div className="app-related-grid">
          {relatedProducts.map((product, index) => (
            <RelatedCard key={index} p={product} />
          ))}
        </div>
      </main>

      <footer className="app-footer">
        <strong className="app-logo-accent">BuyWise</strong> — interactive price compare with Blinkit-style visuals.
      </footer>
    </div>
  );
}