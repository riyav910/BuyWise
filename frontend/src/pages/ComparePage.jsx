import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function ComparePage() {
    const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // 🔐 Protected Route (only logged-in users)
  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      navigate("/login");
    }
  }, [navigate]);

  // 🧮 Compare API
  const handleCompare = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setResult(null);

    const items = input.split(",").map((item) => item.trim());

    try {
      const res = await axios.post("http://127.0.0.1:8000/compare", {
        items: items,
      });

      setResult(res.data);
    } catch (err) {
      console.error(err);
      alert("Error fetching comparison data");
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Compare Prices</h2>

      {/* INPUT SECTION */}
      <div style={styles.inputBox}>
        <input
          style={styles.input}
          type="text"
          placeholder="Enter items (milk, bread, etc)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        <button style={styles.button} onClick={handleCompare}>
          {loading ? "Comparing..." : "Compare"}
        </button>
      </div>

      {/* RESULTS */}
      {result && (
        <div style={styles.resultsContainer}>
          <h3>Results</h3>

          {/* ALL RESULTS */}
          {result?.all?.map((item, index) => (
            <div key={index} style={styles.card}>
              <h3 style={styles.platform}>
                {item.platform.toUpperCase()}
              </h3>

              <p>📦 Product: {item.product_name}</p>
              <p>💰 Price: ₹{item.price}</p>
              <p>📏 Quantity: {item.quantity}</p>
              <p>
                ⚖️ Unit Price:{" "}
                {item.unit_price ? item.unit_price.toFixed(4) : "N/A"}
              </p>
              <p>🚚 Delivery: ₹{item.delivery}</p>
              <p>⏱ ETA: {item.eta} mins</p>
            </div>
          ))}

          {/* BEST DEAL */}
          {result?.best && (
            <div style={styles.bestCard}>
              <h2>🏆 Best Deal</h2>
              <p>
                <b>{result.best.platform.toUpperCase()}</b>
              </p>
              <p>Product: {result.best.product_name}</p>
              <p>
                Unit Price: ₹
                {result.best.unit_price
                  ? result.best.unit_price.toFixed(4)
                  : "N/A"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 🎨 STYLES
const styles = {
  container: {
    padding: "80px 20px 20px 20px", // Increased top padding (80px) to clear the Navbar
    minHeight: "100vh",
    backgroundColor: "#f9fafb",
    fontFamily: "Arial",
    display: "flex",         // Enable Flexbox
    flexDirection: "column", // Stack items vertically
    alignItems: "center",    // Center items horizontally
    // If you want the search bar in the dead center of the screen initially, 
    // you could use justifyContent: "center", but "flex-start" is better 
    // for a search page so results don't push the search bar off-screen.
  },

  title: {
    textAlign: "center",
    marginBottom: "20px",
    fontSize: "28px",
    fontWeight: "bold",
    color: "#111827",
  },

  inputBox: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "40px",
    width: "100%",
    maxWidth: "500px", // Prevents search bar from being too wide
  },

  input: {
    padding: "12px 15px",
    flex: 1, // Let the input take available space in the inputBox
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    outline: "none",
    fontSize: "16px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },

  button: {
    padding: "10px 24px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "white",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s",
  },

  resultsContainer: {
    maxWidth: "800px",
    margin: "auto",
  },

  card: {
    backgroundColor: "#ffffff",
    padding: "15px",
    marginBottom: "15px",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
  },

  platform: {
    color: "#2563eb",
  },

  bestCard: {
    backgroundColor: "#dcfce7",
    padding: "20px",
    borderRadius: "10px",
    marginTop: "20px",
    textAlign: "center",
  },
};