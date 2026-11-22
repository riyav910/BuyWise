import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const [localUser, setLocalUser] = useState(null);
  const [openMenu, setOpenMenu] = useState(false);
  const [pincode, setPincode] = useState(() => {
    return localStorage.getItem("buywise_pincode") || "560001";
  });
  const [editingPin, setEditingPin] = useState(false);
  const [tempPin, setTempPin] = useState(pincode);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user"));
      setLocalUser(stored);
      if (stored?.pincode) {
        setPincode(stored.pincode);
        localStorage.setItem("buywise_pincode", stored.pincode);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (auth?.user?.pincode) {
      setPincode(auth.user.pincode);
      localStorage.setItem("buywise_pincode", auth.user.pincode);
    }
  }, [auth?.user]);

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const u = JSON.parse(localStorage.getItem("user"));
        setLocalUser(u);
        const p = localStorage.getItem("buywise_pincode");
        if (p) setPincode(p);
      } catch (e) {}
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const savePincode = (newPin) => {
    const clean = newPin.replace(/\D/g, "");
    if (clean.length === 6) {
      setPincode(clean);
      localStorage.setItem("buywise_pincode", clean);
      window.dispatchEvent(new Event("buywise_pincode_changed"));
    }
    setEditingPin(false);
  };

  const user = auth?.user || localUser;

  const handleLogout = async () => {
    try {
      if (auth?.logout) {
        await auth.logout();
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
    localStorage.removeItem("user");
    setLocalUser(null);
    setOpenMenu(false);
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="nav-bar">
      <div className="nav-inner">
        <div className="nav-left">
          <div className="nav-logo" onClick={() => navigate("/")}>
            Buy<span className="nav-logo-accent">Wise</span>
          </div>
          <div className="nav-links">
            <span className={`nav-link ${isActive("/") ? "nav-link-active" : ""}`} onClick={() => navigate("/")}>
              Home
            </span>
            <span className={`nav-link ${isActive("/compare") ? "nav-link-active" : ""}`} onClick={() => navigate("/compare")}>
              Compare
            </span>
            <span className={`nav-link ${isActive("/about") ? "nav-link-active" : ""}`} onClick={() => navigate("/about")}>
              About
            </span>
            <span className={`nav-link ${isActive("/deals") ? "nav-link-active" : ""}`} onClick={() => navigate("/deals")}>
              Deals
            </span>
          </div>
        </div>

        <div className="nav-right">
          {/* LOCATION PINCODE SELECTOR */}
          <div className="nav-pincode-wrap" title="Deliver to Pincode (click to change)">
            {editingPin ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  savePincode(tempPin);
                }}
                className="nav-pincode-form"
              >
                <span>📍</span>
                <input
                  type="text"
                  maxLength={6}
                  value={tempPin}
                  onChange={(e) => setTempPin(e.target.value.replace(/\D/g, ""))}
                  onBlur={() => savePincode(tempPin)}
                  autoFocus
                  className="nav-pincode-input"
                  placeholder="PIN code"
                />
              </form>
            ) : (
              <div className="nav-pincode-pill" onClick={() => { setTempPin(pincode); setEditingPin(true); }}>
                <span className="nav-pincode-pin">📍 {pincode}</span>
                <span className="nav-pincode-edit">Change</span>
              </div>
            )}
          </div>

          {!user ? (
            <>
              <span className="nav-link nav-link-muted" onClick={() => navigate("/login")}>
                Log in
              </span>
              <button className="nav-signup-btn" onClick={() => navigate("/signup")}>
                Create Account
              </button>
            </>
          ) : (
            <div className="nav-user-wrap">
              <div className="nav-user-icon" onClick={() => setOpenMenu(!openMenu)}>
                {user?.name || "User"}
              </div>
              {openMenu && (
                <div className="nav-dropdown">
                  <p className="nav-dropdown-name">{user?.name}</p>
                  <hr className="nav-dropdown-divider" />
                  <button
                    className="nav-profile-btn"
                    onClick={() => {
                      setOpenMenu(false);
                      navigate("/profile");
                    }}
                  >
                    Profile
                  </button>
                  <button className="nav-logout-btn" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}