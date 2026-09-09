import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [openMenu, setOpenMenu] = useState(false);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user"));
    setUser(stored);
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      setUser(JSON.parse(localStorage.getItem("user")));
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
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