import { Badge, relatedProducts, PlatformCard, BarRow, RelatedCard } from "./AppContent";

export default function ComparePage({ input, setInput, handleCompare, handleImageUpload, loading, error, result, platforms, maxTotal, onNavigate }) {
  return (
    <div className="app-page">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-logo">
            Buy<span className="app-logo-accent">Wise</span>
          </div>
          <div className="app-search-wrap">
            <span className="app-search-icon">🔍</span>
            <input
              className="app-search-input"
              placeholder="Compare products across platforms"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          {handleImageUpload && (
            <input type="file" accept="image/*" onChange={handleImageUpload} />
          )}
          <button className="app-button app-button-secondary" onClick={() => onNavigate("home")}>Home</button>
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
              Enter product names separated by commas and click Compare. BuyWise shows the best platform,
              delivery, ETA, and total cost in one interactive dashboard.
            </p>
            <div className="app-hero-badges">
              <Badge variant="info">Interactive pricing</Badge>
              <Badge variant="success">Real-time compare</Badge>
              <Badge variant="accent">Blinkit-inspired UI</Badge>
            </div>
          </div>
        </section>

        {error && <div className="app-alert">{error}</div>}

        {result ? (
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
                <div className="app-highlight-meta">Compared {result.all.length} offers</div>
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
        ) : (
          <div className="app-card app-card-empty fade-up">
            <div className="app-card-title">Ready to compare?</div>
            <p className="app-card-copy">
              Enter one or more items like <strong>milk, bread, eggs</strong>, then click Compare to load the latest price comparison across platforms.
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