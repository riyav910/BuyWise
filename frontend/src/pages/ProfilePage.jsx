import { useEffect, useState } from "react";
import api from "../api";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    api
      .get("/user/profile")
      .then((response) => {
        if (mounted) setProfile(response.data.user);
      })
      .catch((requestError) => {
        if (mounted) {
          setError(
            requestError.response?.data?.message ||
              "Unable to load your profile."
          );
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="app-page">
        <section className="app-card app-card-empty fade-up">
          <div className="app-card-title">Loading profile...</div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="app-page">
        <div className="app-alert">{error}</div>
      </main>
    );
  }

  return (
    <main className="app-page">
      <section className="app-main">
        <div className="app-product-hero fade-up">
          <div className="app-prod-emoji">👤</div>
          <div>
            <div className="home-hero-tag">
              <span className="home-hero-tag-dot" />
              <span className="home-hero-tag-label">Account profile</span>
            </div>
            <h1 className="app-hero-title">Your BuyWise profile</h1>
            <p className="app-hero-copy">
              Manage your account details and continue comparing prices across platforms.
            </p>
          </div>
        </div>

        <section className="app-card fade-up">
          <div className="app-card-title">Personal details</div>
          <div className="app-profile-row">
            <span className="app-profile-label">Name</span>
            <strong>{profile.name}</strong>
          </div>
          <div className="app-profile-row">
            <span className="app-profile-label">Email</span>
            <strong>{profile.email}</strong>
          </div>
          <div className="app-profile-row">
            <span className="app-profile-label">Member since</span>
            <strong>{new Date(profile.createdAt).toLocaleDateString()}</strong>
          </div>
        </section>
      </section>
    </main>
  );
}
