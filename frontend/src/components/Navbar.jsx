import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [openMenu, setOpenMenu] = useState(false);

  // Load user initially
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setUser(storedUser);
  }, []);

  // ✅ FIX: auto update navbar when login happens in same tab
  useEffect(() => {
    const handleStorageChange = () => {
      const updatedUser = JSON.parse(localStorage.getItem("user"));
      setUser(updatedUser);
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setOpenMenu(false);
    navigate("/login");
  };

  return (
    <div style={styles.navbar}>

      {/* LEFT SIDE */}
      <div style={styles.left}>
        <h2 style={styles.logo}>BuyWise 🛒</h2>

        <span style={styles.link} onClick={() => navigate("/")}>
          Home
        </span>

        <span style={styles.link} onClick={() => navigate("/compare")}>
          Compare
        </span>
      </div>

      {/* RIGHT SIDE */}
      <div style={styles.right}>
        {!user ? (
          <button
            style={styles.signupBtn}
            onClick={() => navigate("/signup")}
          >
            Create Account
          </button>
        ) : (
          <div style={styles.userWrapper}>

            {/* USER ICON */}
            <div
              style={styles.userIcon}
              onClick={() => setOpenMenu(!openMenu)}
            >
              {/* ✅ FULL NAME NOW SHOWN */}
              {user?.name || "User"}
            </div>

            {/* DROPDOWN */}
            {openMenu && (
              <div style={styles.dropdown}>
                <p style={styles.username}>
                  {user?.name}
                </p>

                <hr style={{ margin: "8px 0" }} />

                <button
                  style={styles.logoutBtn}
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  navbar: {
  position: "fixed",   // ✅ keeps navbar fixed
  top: 0,
  left: 0,
  width: "100%",       // full width
  zIndex: 1000,        // stays above everything
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 20px",
  backgroundColor: "#f9fafb",
  borderBottom: "1px solid #e5e7eb",
  fontFamily: "Arial",
},

  left: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
  },

  logo: {
    margin: 0,
    fontWeight: "bold",
    fontSize: "20px",
  },

  link: {
    cursor: "pointer",
    fontSize: "15px",
    color: "#111",
  },

  right: {
    display: "flex",
    alignItems: "center",
  },

  signupBtn: {
    padding: "8px 14px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "white",
    cursor: "pointer",
  },

  userWrapper: {
    position: "relative",
    cursor: "pointer",
  },

  userIcon: {
    padding: "8px 12px",
    borderRadius: "20px",
    backgroundColor: "#dbeafe",
    fontWeight: "bold",
    color: "#1e3a8a",
    minWidth: "80px",
    textAlign: "center",
  },

  dropdown: {
    position: "absolute",
    top: "45px",
    right: "0",
    width: "160px",
    backgroundColor: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    padding: "10px",
    zIndex: 1000,
  },

  username: {
    margin: 0,
    fontSize: "14px",
    fontWeight: "bold",
  },

  logoutBtn: {
    width: "100%",
    padding: "6px",
    marginTop: "5px",
    border: "none",
    borderRadius: "5px",
    backgroundColor: "#ef4444",
    color: "white",
    cursor: "pointer",
  },
};