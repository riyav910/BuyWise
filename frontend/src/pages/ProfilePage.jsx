import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      api.get("/user/profile"),
      api.get("/user/orders")
    ])
      .then(([profileRes, ordersRes]) => {
        if (mounted) {
          setProfile(profileRes.data.user);
          setOrders(ordersRes.data.orders || []);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(
            err.response?.data?.message || "Unable to load your profile and orders."
          );
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleRemoveProduct = async (orderId, itemId) => {
    if (!window.confirm("Remove this product from your order history?")) return;
    const actionKey = `${orderId}-${itemId}`;
    setDeletingId(actionKey);
    try {
      const res = await api.delete(`/user/orders/${orderId}/items/${itemId}`);
      if (res.data.orderDeleted) {
        setOrders((prev) => prev.filter((o) => o._id !== orderId));
      } else if (res.data.order) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? res.data.order : o))
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove product from order.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to remove this entire order from your history?")) return;
    setDeletingId(orderId);
    try {
      await api.delete(`/user/orders/${orderId}`);
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove order from history.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <main className="app-page">
        <section className="app-card app-card-empty fade-up" style={{ maxWidth: "800px", margin: "60px auto" }}>
          <div className="app-card-title">Loading profile & orders...</div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="app-page">
        <div className="app-main" style={{ maxWidth: "800px", margin: "40px auto" }}>
          <div className="app-alert">{error}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="app-page">
      <section className="app-main" style={{ maxWidth: "900px", margin: "0 auto", padding: "30px 20px 60px" }}>
        {/* User Hero Header */}
        <div className="app-product-hero fade-up" style={{ marginBottom: "28px" }}>
          <div className="app-prod-emoji">👤</div>
          <div>
            <div className="home-hero-tag" style={{ marginBottom: "6px" }}>
              <span className="home-hero-tag-dot" />
              <span className="home-hero-tag-label">Account profile</span>
            </div>
            <h1 className="app-hero-title">{profile?.name || "User Profile"}</h1>
            <p className="app-hero-copy">
              Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "Recently"}
            </p>
            <div className="app-hero-badges" style={{ gap: "8px" }}>
              <span className="app-badge app-badge-info" style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "8px" }}>
                📧 {profile?.email}
              </span>
              <span className="app-badge app-badge-success" style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "8px" }}>
                🛒 {orders.length} {orders.length === 1 ? "Order" : "Orders"} Completed
              </span>
            </div>
          </div>
        </div>

        {/* Account Details Card */}
        <section className="app-card fade-up" style={{ marginBottom: "28px", padding: "24px" }}>
          <div className="app-card-title" style={{ fontSize: "16px", marginBottom: "16px", fontWeight: "700" }}>Personal Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.05em" }}>Full Name</div>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", marginTop: "4px" }}>{profile?.name}</div>
            </div>
            <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.05em" }}>Email Address</div>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", marginTop: "4px" }}>{profile?.email}</div>
            </div>
            <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.05em" }}>Account Status</div>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#16a34a", marginTop: "4px" }}>Active Member</div>
            </div>
          </div>
        </section>

        {/* Order History Section */}
        <section className="fade-up">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, color: "#000000", fontWeight: "700", fontSize: "18px", fontFamily: '"Syne", sans-serif' }}>
              Order History
            </h2>
            {orders.length > 0 && (
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                Total Lifetime Spend: <strong>₹{orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toFixed(2)}</strong>
              </span>
            )}
          </div>

          {orders.length === 0 ? (
            <div className="app-card app-card-empty" style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>🛍️</div>
              <div className="app-card-title">No orders in your history yet</div>
              <p className="app-card-copy" style={{ maxWidth: "450px", margin: "0 auto 18px" }}>
                Compare grocery lists across Blinkit, Zepto, BigBasket, and JioMart to find the best savings and place orders!
              </p>
              <Link to="/compare" className="app-button app-button-primary" style={{ textDecoration: "none", display: "inline-block" }}>
                Start Price Comparison
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {orders.map((order) => {
                const isSplit = order.orderMode === "split_store" || (order.platformsUsed && order.platformsUsed.length > 1);
                return (
                  <div
                    key={order._id}
                    className="app-card"
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                      padding: "20px",
                      background: "#ffffff",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>
                            ₹{Number(order.totalAmount).toFixed(2)}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              padding: "2px 8px",
                              borderRadius: "999px",
                              background: isSplit ? "#eff6ff" : "#f0fdf4",
                              color: isSplit ? "#1d4ed8" : "#15803d",
                              border: `1px solid ${isSplit ? "#bfdbfe" : "#bbf7d0"}`,
                              textTransform: "uppercase"
                            }}
                          >
                            {isSplit ? "⚡ Split Cart" : "🏪 Single Store"}
                          </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                          Order placed on {new Date(order.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} at {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {order.savingsAmount > 0 && (
                          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "4px 10px", borderRadius: "8px", fontSize: "12px", color: "#15803d", fontWeight: "700" }}>
                            Saved ₹{Number(order.savingsAmount).toFixed(2)}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(order._id)}
                          disabled={deletingId === order._id}
                          title="Remove entire order from history"
                          style={{
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            color: "#dc2626",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: deletingId === order._id ? "not-allowed" : "pointer",
                            transition: "all 0.15s ease"
                          }}
                        >
                          {deletingId === order._id ? "Removing..." : "🗑️ Delete Order"}
                        </button>
                      </div>
                    </div>

                    {/* Platforms Used Chips */}
                    {order.platformsUsed && order.platformsUsed.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>Stores:</span>
                        {order.platformsUsed.map((p) => (
                          <span
                            key={p}
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              textTransform: "capitalize",
                              background: "#f1f5f9",
                              color: "#334155",
                              padding: "2px 8px",
                              borderRadius: "6px"
                            }}
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Items List */}
                    <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: "12px" }}>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
                        Items in this order ({order.items?.length || 0})
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {order.items?.map((item, idx) => {
                          const itemActionKey = `${order._id}-${item._id || idx}`;
                          const isRemoving = deletingId === itemActionKey;
                          return (
                            <div
                              key={item._id || idx}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                fontSize: "13px",
                                color: "#334155",
                                padding: "4px 0",
                                borderBottom: idx < order.items.length - 1 ? "1px solid #f8fafc" : "none"
                              }}
                            >
                              <div>
                                <span>
                                  {item.quantity > 1 ? `${item.quantity}x ` : ""}
                                  <strong>{item.name}</strong>
                                </span>
                                <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "6px" }}>
                                  ({item.platform}{item.packageDisplay ? ` · ${item.packageDisplay}` : ""})
                                </span>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <span style={{ fontWeight: "700", color: "#0f172a" }}>
                                  ₹{Number(item.price * (item.quantity || 1)).toFixed(2)}
                                </span>
                                {item._id && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveProduct(order._id, item._id)}
                                    disabled={isRemoving}
                                    title="Remove this product from order history"
                                    style={{
                                      background: "#f8fafc",
                                      border: "1px solid #e2e8f0",
                                      color: "#ef4444",
                                      fontSize: "11px",
                                      fontWeight: "600",
                                      cursor: isRemoving ? "not-allowed" : "pointer",
                                      padding: "3px 8px",
                                      borderRadius: "6px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "3px",
                                      transition: "all 0.15s ease"
                                    }}
                                  >
                                    {isRemoving ? "..." : "✕ Remove"}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
