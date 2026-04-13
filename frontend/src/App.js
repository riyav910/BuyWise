import { useState } from "react";
import axios from "axios";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Navbar from "./components/Navbar";
import CreateAccount from "./pages/CreateAccount";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
  const user = localStorage.getItem("user");
  if (!user) {
    navigate("/login");
  }
}, []);

  const handleCompare = async () => {
    const items = input.split(",").map(item => item.trim());

    const res = await axios.post("http://127.0.0.1:8000/compare", {
      items: items
    });

    setResult(res.data);
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={styles.header}>


   </div>

      <input
        type="text"
        placeholder="Enter items (milk, bread)"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button onClick={handleCompare}>Compare</button>

      {result && (
        <div>
          <h2>Results:</h2>

          {Object.keys(result).map((platform) => (
            <div key={platform}>
              <h3>{platform}</h3>
              <p>Items Price: ₹{result[platform].items_price}</p>
              <p>Delivery Fee: ₹{result[platform].delivery_fee}</p>
              <p><b>Total: ₹{result[platform].total_cost}</b></p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
    <Navbar />
      <Routes>
        {/* Existing BuyWise page */}
        <Route path="/" element={<Home />} />

        {/* New Login page */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<CreateAccount />} />
      </Routes>
    </BrowserRouter>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  loginButton: {
    padding: "8px 15px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
export default App;