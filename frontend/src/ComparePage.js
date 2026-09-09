import { useState } from "react";
import { Badge, relatedProducts, PlatformCard, BarRow, RelatedCard } from "./AppContent";

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
  if (!optimized || !optimized.split_cart) return null;

  const { split_cart, single_cart } = optimized;
  const splitTotal = Math.round(split_cart.total_cost_inr ?? 0);
  const singleTotal = Math.round(single_cart?.total_cost_inr ?? 0);
  const savings = singleTotal > splitTotal ? singleTotal - splitTotal : 0;

  return (
    <div className="app-optimizer-card fade-up">
      <div className="app-optimizer-header">
        <div>
          <span className="app-optimizer-badge">⚡ Smart Cart Optimizer</span>
          <h2 className="app-optimizer-title">Cheapest Order Combination</h2>
          <p className="app-optimizer-subtitle">
            Buy items from platforms where they are cheapest to maximize your savings across {products?.length || split_cart.items?.length} items.
          </p>
        </div>
        <div className="app-optimizer-total-wrap">
          <div className="app-optimizer-total-label">Optimized Split Cart</div>
          <div className="app-optimizer-total-value">₹{splitTotal}</div>
          <div style={{ fontSize: "12px", color: "#166534" }}>
            (Items: ₹{Math.round(split_cart.items_cost_inr || 0)} + Del: ₹{Math.round(split_cart.delivery_cost_inr || 0)})
          </div>
        </div>
      </div>

      <div className="app-optimizer-items-grid">
        {split_cart.items?.map((item, idx) => (
          <div key={`split-${idx}`} className="app-optimizer-item-row">
            <div className="app-optimizer-item-info">
              <span className="app-optimizer-item-name">{item.product_name || item.search_term}</span>
              <span className="app-optimizer-item-platform">
                Buy on <strong style={{ textTransform: "capitalize", color: "#16a34a" }}>{item.platform}</strong>
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 800, fontSize: "16px", color: "#0f172a" }}>₹{item.price}</div>
              {item.product_url && (
                <a
                  href={item.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "12px", color: "#2563eb", textDecoration: "underline" }}
                >
                  View ↗
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {savings > 0 ? (
        <div className="app-optimizer-savings-banner">
          <span>
            🎉 <strong>Save ₹{savings}</strong> by splitting order across {split_cart.platforms_used?.join(" & ")} vs single store ({single_cart?.platform || "best single store"}: ₹{singleTotal})!
          </span>
          <Badge variant="accent">Best Split Deal</Badge>
        </div>
      ) : single_cart ? (
        <div className="app-optimizer-savings-banner" style={{ background: "#166534" }}>
          <span>
            ✅ <strong>Single Store Recommended:</strong> Buying everything on <strong style={{ textTransform: "capitalize" }}>{single_cart.platform}</strong> costs ₹{singleTotal} with single delivery.
          </span>
          <Badge variant="success">Single Delivery Winner</Badge>
        </div>
      ) : null}
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 className="app-product-title">{prod.term}</h2>
              <span className="app-product-counter-tag">
                {index + 1} of {totalCount}
              </span>
            </div>
            <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
              Compared across {prod.platforms?.length || 0} quick-commerce platforms
            </div>
          </div>
        </div>

        {prod.best && (
          <div style={{ textAlign: "right" }}>
            <div className="app-highlight-label" style={{ color: "#166534" }}>Best Deal for {prod.term}</div>
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
          </div>
          {handleImageUpload && (
            <input type="file" accept="image/*" onChange={handleImageUpload} />
          )}
          <button className="app-button app-button-primary" onClick={() => handleCompare()}>
            {loading ? "Comparing..." : "Compare"}
          </button>
        </div>
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
              Enter product names separated by commas (e.g., <strong>milk, bread, eggs</strong>) to extract and compare all items in parallel across Blinkit, Zepto, BigBasket, and JioMart.
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

                  {result.optimized?.split_cart && (
                    <button
                      className={`app-product-tab ${activeTab === "optimizer" ? "app-product-tab--active" : ""}`}
                      onClick={() => setActiveTab("optimizer")}
                    >
                      <span>⚡ Smart Split Cart</span>
                      <span className="app-product-tab-pill">
                        ₹{Math.round(result.optimized.split_cart.total_cost_inr || 0)}
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
                    <div className="app-highlight-label">Best order deal</div>
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