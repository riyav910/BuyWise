import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/login",
        {
          email,
          password,
        }
      );

      if (res.data.status === "success") {
        const userData = res.data.user;

        localStorage.setItem(
          "user",
          JSON.stringify(userData)
        );

        window.dispatchEvent(
          new Event("storage")
        );

        navigate("/");
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={styles.pageWrap}>
      <style>{`

        @keyframes bwBlobFloat {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }

          50% {
            transform: translate(24px, -18px) scale(1.1);
          }
        }

        @keyframes bwCardIn {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.99);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes bwSpin {
          to {
            transform: rotate(360deg);
          }
        }


        /* INPUT FOCUS */

        .bw-auth-input:focus {
          border-color: #16a34a !important;

          box-shadow:
            0 0 0 3px rgba(22,163,74,0.14) !important;
        }


        /* LOGIN BUTTON */

        .bw-auth-btn:hover:not(:disabled) {
          background: #15803d !important;

          box-shadow:
            0 8px 22px rgba(22,163,74,0.25) !important;

          transform: translateY(-1px);
        }

        .bw-auth-btn:active:not(:disabled) {
          transform: translateY(1px);
        }

        .bw-auth-btn:disabled {
          opacity: 0.75;
          cursor: not-allowed;
        }


        /* CREATE ACCOUNT LINK */

        .bw-auth-toggle:hover {
          color: #15803d !important;
        }


        /* FORGOT PASSWORD */

        .bw-forgot:hover {
          color: #16a34a !important;
        }


        /* RESPONSIVE */

        @media (max-width: 720px) {

          .bw-auth-left {
            display: none !important;
          }

          .bw-auth-right {
            flex: 1 1 100% !important;
          }

        }


        @media (max-width: 500px) {

          .bw-auth-right {
            padding: 35px 22px !important;
          }

          .bw-auth-card-shell {
            min-height: auto !important;
            border-radius: 18px !important;
          }

        }

      `}</style>

      <div style={styles.cardShell}>

        <div
          className="bw-auth-left"
          style={styles.left}
        >

          {/* Green blob */}

          <div
            style={{
              ...styles.blob,
              top: "-70px",
              right: "-50px",
              width: 200,
              height: 200,
            }}
          />


          {/* Lime blob */}

          <div
            style={{
              ...styles.blob,
              bottom: "-80px",
              left: "-30px",
              width: 170,
              height: 170,
              background: "#c8f26a",
              animationDelay: "-5s",
            }}
          />


          {/* Left content */}

          <div style={styles.leftInner}>

            {/* BRAND */}

            <div style={styles.brand}>

              Buy

              <span
                style={{
                  color: "#4ade80",
                }}
              >
                Wise
              </span>{" "}

              🛒

            </div>


            {/* HEADING */}

            <h3 style={styles.leftTitle}>
              Secure price tracking for smart shoppers
            </h3>


            {/* FEATURES */}

            <ul style={styles.checklist}>

              <li style={styles.checkItem}>

                <span style={styles.checkIcon}>
                  ✓
                </span>

                <span>
                  Real-time price comparison
                </span>

              </li>


              <li style={styles.checkItem}>

                <span style={styles.checkIcon}>
                  ✓
                </span>

                <span>
                  ML-powered buy alerts
                </span>

              </li>


              <li style={styles.checkItem}>

                <span style={styles.checkIcon}>
                  ✓
                </span>

                <span>
                  Multi-platform tracking
                </span>

              </li>


              <li style={styles.checkItem}>

                <span style={styles.checkIcon}>
                  ✓
                </span>

                <span>
                  Personalised watchlists
                </span>

              </li>

            </ul>


            {/* STATISTICS */}

            <div style={styles.leftStats}>

              <div style={styles.leftStat}>

                <b style={styles.leftStatValue}>
                  3
                </b>

                <span style={styles.leftStatLabel}>
                  Platforms
                </span>

              </div>


              <div style={styles.leftStat}>

                <b style={styles.leftStatValue}>
                  87%
                </b>

                <span style={styles.leftStatLabel}>
                  ML accuracy
                </span>

              </div>


              <div style={styles.leftStat}>

                <b style={styles.leftStatValue}>
                  &lt;2min
                </b>

                <span style={styles.leftStatLabel}>
                  Refresh rate
                </span>

              </div>

            </div>

          </div>

        </div>


        <div
          className="bw-auth-right"
          style={styles.right}
        >

          <div style={styles.formInner}>


            {/* TITLE */}

            <h2 style={styles.title}>
              Welcome Back!
            </h2>


            {/* SUBTITLE */}

            <p style={styles.subtitle}>
              Sign in to your BuyWise account
            </p>

            <form
              onSubmit={handleLogin}
              style={styles.form}
            >

              <div style={styles.fieldWrap}>

                <label
                  style={styles.label(
                    focusedField === "email" ||
                    email
                  )}
                >
                  Email
                </label>


                <input
                  className="bw-auth-input"
                  style={styles.input}
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  onFocus={() =>
                    setFocusedField("email")
                  }
                  onBlur={() =>
                    setFocusedField(null)
                  }
                  required
                />

              </div>


              <div style={styles.fieldWrap}>

                <div style={styles.labelRow}>

                  <label
                    style={styles.label(
                      focusedField === "password" ||
                      password
                    )}
                  >
                    Password
                  </label>


                  <span
                    className="bw-forgot"
                    style={styles.forgot}
                  >
                    Forgot password?
                  </span>

                </div>


                <input
                  className="bw-auth-input"
                  style={styles.input}
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  onFocus={() =>
                    setFocusedField("password")
                  }
                  onBlur={() =>
                    setFocusedField(null)
                  }
                  required
                />

              </div>

              <button
                className="bw-auth-btn"
                style={styles.button}
                type="submit"
                disabled={loading}
              >

                {loading ? (

                  <span style={styles.spinnerRow}>

                    <span
                      style={styles.spinner}
                    />

                    Logging in...

                  </span>

                ) : (

                  "Login"

                )}

              </button>

            </form>

            <p style={styles.text}>

              New to BuyWise?{" "}

              <span
                className="bw-auth-toggle"
                style={styles.link}
                onClick={() =>
                  navigate("/signup")
                }
              >
                Create Account
              </span>

            </p>

          </div>

        </div>

      </div>

    </div>
  );
}

const styles = {

  pageWrap: {
    minHeight: "100vh",

    width: "100%",

    boxSizing:
      "border-box",

    display:
      "flex",

    justifyContent:
      "center",

    alignItems:
      "center",

    fontFamily:
      "Arial, sans-serif",

    background:
      "linear-gradient(135deg, #e7f5ec 0%, #f4f1ea 100%)",

    padding:
      "40px 24px",
  },


  cardShell: {
    display:
      "flex",

    width:
      "100%",

    maxWidth:
      "1000px",

    minHeight:
      "560px",

    borderRadius:
      "24px",

    overflow:
      "hidden",

    boxShadow:
      "0 30px 80px rgba(11,42,32,0.18)",

    background:
      "#fff",

    animation:
      "bwCardIn 0.35s ease",
  },


  left: {
    position:
      "relative",

    flex:
      "0 0 50%",

    background:
      "#1a3a2a",

    overflow:
      "hidden",

    display:
      "flex",

    alignItems:
      "center",
  },


  blob: {
    position:
      "absolute",

    borderRadius:
      "50%",

    background:
      "#4ade80",

    filter:
      "blur(70px)",

    opacity:
      0.35,

    animation:
      "bwBlobFloat 14s ease-in-out infinite",
  },


  leftInner: {
    position:
      "relative",

    zIndex:
      2,

    width:
      "100%",

    boxSizing:
      "border-box",

    padding:
      "56px 50px",
  },


  brand: {
    fontSize:
      "22px",

    fontWeight:
      700,

    color:
      "#fff",

    marginBottom:
      "32px",
  },



  leftTitle: {
    fontSize:
      "25px",

    fontWeight:
      700,

    color:
      "#fff",

    lineHeight:
      1.35,

    marginBottom:
      "24px",

    maxWidth:
      "390px",
  },


  checklist: {
    listStyle:
      "none",

    padding:
      0,

    margin:
      "0 0 38px",

    display:
      "flex",

    flexDirection:
      "column",

    gap:
      "13px",
  },


  checkItem: {
    display:
      "flex",

    alignItems:
      "center",

    gap:
      "10px",

    fontSize:
      "15px",

    color:
      "rgba(255,255,255,0.85)",
  },


  checkIcon: {
    width:
      "20px",

    height:
      "20px",

    borderRadius:
      "6px",

    background:
      "#4ade80",

    color:
      "#0b2a20",

    fontSize:
      "12px",

    fontWeight:
      700,

    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    flexShrink:
      0,
  },



  leftStats: {
    display:
      "flex",

    gap:
      "36px",
  },


  leftStat: {
    display:
      "flex",

    flexDirection:
      "column",
  },


  leftStatValue: {
    fontSize:
      "24px",

    fontWeight:
      700,

    color:
      "#4ade80",
  },


  leftStatLabel: {
    fontSize:
      "12px",

    color:
      "rgba(255,255,255,0.55)",

    marginTop:
      "4px",
  },

  right: {
    flex:
      "1 1 50%",

    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    padding:
      "54px 58px",

    boxSizing:
      "border-box",

    background:
      "#fff",
  },


  formInner: {
    width:
      "100%",

    maxWidth:
      "390px",
  },


  form: {
    marginTop:
      "20px",
  },



  title: {
    fontSize:
      "30px",

    fontWeight:
      700,

    color:
      "#111827",

    marginBottom:
      "7px",

    textAlign:
      "center",
  },



  subtitle: {
    fontSize:
      "15px",

    color:
      "#6b7280",

    textAlign:
      "center",

    margin:
      0,
  },


  fieldWrap: {
    marginBottom:
      "20px",

    textAlign:
      "left",
  },


  labelRow: {
    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "space-between",
  },



  label: (active) => ({
    display:
      "block",

    fontSize:
      "13px",

    fontWeight:
      600,

    marginBottom:
      "7px",

    color:
      active
        ? "#16a34a"
        : "#6b7280",

    transition:
      "color 0.15s ease",
  }),


  forgot: {
    fontSize:
      "12px",

    color:
      "#9ca3af",

    cursor:
      "pointer",

    fontWeight:
      600,

    transition:
      "color 0.15s ease",
  },


  input: {
    width:
      "100%",

    boxSizing:
      "border-box",

    padding:
      "14px",

    borderRadius:
      "11px",

    border:
      "1.5px solid #e5e7eb",

    outline:
      "none",

    fontSize:
      "15px",

    background:
      "#fff",

    transition:
      "border-color 0.15s ease, box-shadow 0.15s ease",
  },



  button: {
    width:
      "100%",

    padding:
      "14px",

    background:
      "#16a34a",

    color:
      "white",

    border:
      "none",

    borderRadius:
      "11px",

    cursor:
      "pointer",

    fontWeight:
      700,

    fontSize:
      "15px",

    marginTop:
      "7px",

    transition:
      "background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease",

    boxShadow:
      "0 4px 12px rgba(22,163,74,0.14)",
  },


  spinnerRow: {
    display:
      "inline-flex",

    alignItems:
      "center",

    gap:
      "9px",

    justifyContent:
      "center",
  },


  spinner: {
    width:
      "15px",

    height:
      "15px",

    border:
      "2px solid rgba(255,255,255,0.4)",

    borderTopColor:
      "#fff",

    borderRadius:
      "50%",

    display:
      "inline-block",

    animation:
      "bwSpin 0.7s linear infinite",
  },


  text: {
    marginTop:
      "22px",

    fontSize:
      "14px",

    color:
      "#374151",

    textAlign:
      "center",
  },


  link: {
    color:
      "#16a34a",

    cursor:
      "pointer",

    fontWeight:
      700,

    transition:
      "color 0.15s ease",
  },

};