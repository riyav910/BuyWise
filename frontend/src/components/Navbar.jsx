import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const [localUser, setLocalUser] = useState(null);
  const [openMenu, setOpenMenu] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user"));
      setLocalUser(stored);
    } catch (e) {}
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        setLocalUser(JSON.parse(localStorage.getItem("user")));
      } catch (e) {}
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

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