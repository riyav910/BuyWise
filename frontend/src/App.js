import { useState } from "react";
import axios from "axios";

function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    setLoading(true);

    const items = input.split(",").map(item => item.trim());

    try {
      const res = await axios.post("http://127.0.0.1:8000/compare", {
        items: items
      });

      setResult(res.data);
    } catch (err) {
      console.error(err);
      alert("Error fetching data");
    }

    setLoading(false);
  };

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

    // auto-fill input box
    setInput(res.data.items.join(", "));
  } catch (err) {
    console.error(err);
    alert("OCR failed");
  }
};

  return (
    <div style={styles.container}>
      <h1 style={styles.title}> BuyWise</h1>
      {/* <input type="file" accept="image/*" onChange={handleImageUpload} /> */}
      <div style={styles.inputBox}>
        <input
          style={styles.input}
          type="text"
          placeholder="Enter items (milk, bread)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        <button style={styles.button} onClick={handleCompare}>
          {loading ? "Comparing..." : "Compare"}
        </button>
      </div>

      {result && (
        <div style={styles.resultsContainer}>
          <h2 style={styles.subtitle}>Results</h2>

          {/* 🔹 All Platforms */}
          {result.all.map((item, index) => (
            <div key={index} style={styles.card}>
              <h3 style={styles.platform}>
                {item.platform.toUpperCase()}
              </h3>

              <p>Product: {item.product_name}</p>
              <p>Price: ₹{item.price}</p>
              <p>Quantity: {item.quantity} ml/g</p>
              <p>Unit Price: ₹{item.unit_price?.toFixed(4)}</p>
              <p>Delivery: ₹{item.delivery}</p>
              <p>ETA: {item.eta} mins</p>
            </div>
          ))}

          {/* BEST PLATFORM */}
          <div style={styles.bestCard}>
            <h2>Best Deal</h2>
            <p><b>{result.best.platform.toUpperCase()}</b></p>
            <p>Product: {result.best.product_name}</p>
            <p>Unit Price: ₹{result.best.unit_price?.toFixed(4)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;


const styles = {
  container: {
    backgroundColor: "#0f172a",
    minHeight: "100vh",
    padding: "30px",
    color: "#e2e8f0",
    fontFamily: "Arial"
  },

  title: {
    textAlign: "center",
    marginBottom: "30px"
  },

  inputBox: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "30px"
  },

  input: {
    padding: "10px",
    width: "300px",
    borderRadius: "8px",
    border: "none",
    outline: "none"
  },

  button: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#3b82f6",
    color: "white",
    cursor: "pointer"
  },

  resultsContainer: {
    maxWidth: "800px",
    margin: "auto"
  },

  subtitle: {
    marginBottom: "20px"
  },

  card: {
    backgroundColor: "#1e293b",
    padding: "15px",
    marginBottom: "15px",
    borderRadius: "10px",
    boxShadow: "0 0 10px rgba(0,0,0,0.3)"
  },

  platform: {
    color: "#38bdf8"
  },

  bestCard: {
    backgroundColor: "#065f46",
    padding: "20px",
    borderRadius: "10px",
    marginTop: "20px",
    textAlign: "center"
  }
};