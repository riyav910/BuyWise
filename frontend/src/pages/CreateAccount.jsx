import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function CreateAccount() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post("http://127.0.0.1:8000/signup", {
        name,
        email,
        password,
      });

      if (res.data.status === "success") {
        // ✅ IMPORTANT: use backend response if available
        const userData = res.data.user
          ? res.data.user
          : { name, email };

        localStorage.setItem("user", JSON.stringify(userData));

        // ✅ instantly update navbar
        window.dispatchEvent(new Event("storage"));

        navigate("/login");
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      alert("Signup failed");
    }
  };

 return (
  <div style={styles.container}>
    <div style={styles.card}>
      <h2 style={styles.title}>Create Account</h2>

      <form onSubmit={handleSignup}>
        <input
          style={styles.input}
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button style={styles.button} type="submit">
          Create Account
        </button>
      </form>

      <p style={styles.text}>
        Already have an account?{" "}
        <span style={styles.link} onClick={() => navigate("/login")}>
          Login
        </span>
      </p>
    </div>
  </div>
);
}

/* styles unchanged */
const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #e0f2fe, #f8fafc)",
    fontFamily: "Arial",
  },

  card: {
    width: "340px",
    padding: "28px",
    borderRadius: "14px",
    background: "white",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    border: "1px solid #e5e7eb",
    textAlign: "center",
  },

  title: {
    marginBottom: "18px",
    fontSize: "22px",
    fontWeight: "700",
    color: "#111827",
  },

  input: {
    width: "100%",
    padding: "11px",
    margin: "10px 0",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    outline: "none",
    transition: "0.2s",
  },

  button: {
    width: "100%",
    padding: "11px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    marginTop: "10px",
  },

  text: {
    marginTop: "12px",
    fontSize: "14px",
    color: "#374151",
  },

  link: {
    color: "#2563eb",
    cursor: "pointer",
    fontWeight: "bold",
  },
};