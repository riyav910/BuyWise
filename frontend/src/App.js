import { useState } from "react";
import axios from "axios";

function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);

  const handleCompare = async () => {
    const items = input.split(",").map(item => item.trim());

    const res = await axios.post("http://127.0.0.1:8000/compare", {
      items: items
    });

    setResult(res.data);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>BuyWise 🛒</h1>

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

export default App;