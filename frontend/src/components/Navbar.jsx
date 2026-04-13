import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem("user"));
  const [showMenu, setShowMenu] = useState(false);

  // ❌ hide buttons on login/signup pages
  const hideNavOptions =
    location.pathname === "/login" || location.pathname === "/signup";

  // 🚪 Logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div style={styles.navbar}>
      {/* LEFT SIDE */}
      <div style={styles.left}>
        <div style={styles.brand} onClick={() => navigate("/")}>
          <span style={styles.logo}>🛒</span>
          <h2 style={styles.title}>BuyWise</h2>
        </div>

        {/* ✅ Show Home only after login */}
        {!hideNavOptions && user && (
          <span style={styles.homeText} onClick={() => navigate("/")}>
            Home
          </span>
        )}
      </div>

      {/* RIGHT SIDE */}
      <div style={styles.right}>
        {user ? (
          <div style={styles.userWrapper}>
            {/* 👤 USER ICON */}
            <div
              style={styles.userIcon}
              onClick={() => setShowMenu(!showMenu)}
              title={user.name || user.email}
            >
              👤
            </div>

            {/* DROPDOWN */}
            {showMenu && (
              <div style={styles.dropdown}>
                <p style={styles.userName}>
                  {user.name || user.email}
                </p>

                <button style={styles.logoutBtn} onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          // ❌ Hide button on login/signup page
          !hideNavOptions && (
            <button
              style={styles.button}
              onClick={() => navigate("/signup")}
            >
              Create Account
            </button>
          )
        )}
      </div>
    </div>
  );
}

const styles = {
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 20px",
    backgroundColor: "#f9fafb", // light color
    borderBottom: "1px solid #e5e7eb",
  },

  left: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
  },

  logo: {
    fontSize: "22px",
  },

  title: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "bold",
    color: "#1e3a8a",
  },

  homeText: {
    cursor: "pointer",
    color: "#1e3a8a",
    fontWeight: "500",
  },

  right: {
    display: "flex",
    alignItems: "center",
    position: "relative",
  },

  userWrapper: {
    position: "relative",
  },

  userIcon: {
    fontSize: "18px",
    cursor: "pointer",
    backgroundColor: "#e0e7ff",
    color: "#1e3a8a",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #c7d2fe",
  },

  dropdown: {
    position: "absolute",
    right: 0,
    top: "40px",
    backgroundColor: "white",
    border: "1px solid #ddd",
    borderRadius: "6px",
    padding: "10px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
    width: "160px",
    textAlign: "center",
  },

  userName: {
    fontSize: "14px",
    marginBottom: "8px",
    color: "#333",
  },

  logoutBtn: {
    padding: "6px 10px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    backgroundColor: "#ef4444",
    color: "white",
    width: "100%",
  },

  button: {
    padding: "8px 14px",
    border: "1px solid #1e3a8a",
    borderRadius: "6px",
    cursor: "pointer",
    backgroundColor: "white",
    color: "#1e3a8a",
    fontWeight: "500",
  },
};