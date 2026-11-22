import { useState } from "react";
import api from "../api";

export default function CartPage() {
  const [items, setItems] = useState("");
  const [optimization, setOptimization] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleOptimize(event) {
    event.preventDefault();
    const productItems = items.split(",").map((item) => item.trim()).filter(Boolean);

    if (!productItems.length) {
      setError("Enter at least one product.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/cart/optimize", { items: productItems });
      setOptimization(response.data.data);
    } catch (requestError) {
      setOptimization(null);
      setError(requestError.response?.data?.message || "Unable to optimize the cart.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-page">
      <section className="app-main">
        <div className="app-product-hero fade-up">
          <div className="app-prod-emoji">🛒</div>
          <div>
            <div className="home-hero-tag">
              <span className="home-hero-tag-dot" />
              <span className="home-hero-tag-label">Cart optimization</span>
            </div>
            <h1 className="app-hero-title">Build a cheaper cart</h1>
            <p className="app-hero-copy">
              Enter multiple products and BuyWise will find the most cost-effective platform combination.
            </p>
          </div>
        </div>

        <form className="app-card fade-up" onSubmit={handleOptimize}>
          <div className="app-card-title">Products</div>
          <input
            className="app-search-input app-cart-input"
            value={items}
            onChange={(event) => setItems(event.target.value)}
            placeholder="milk, bread, eggs"
          />
          <button className="app-button app-button-primary" type="submit" disabled={loading}>
            {loading ? "Optimizing..." : "Optimize cart"}
          </button>
        </form>

        {error && <div className="app-alert">{error}</div>}

        {optimization && (
          <section className="app-card fade-up">
            <div className="app-card-title">Recommended cart split</div>
            <pre className="app-cart-result">{JSON.stringify(optimization, null, 2)}</pre>
          </section>
        )}
      </section>
    </main>
  );
}