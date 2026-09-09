import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function CreateAccount() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/signup",
        {
          name,
          email,
          password,
        }
      );

      if (res.data.status === "success") {
        const userData = res.data.user
          ? res.data.user
          : { name, email };

        localStorage.setItem(
          "user",
          JSON.stringify(userData)
        );

        window.dispatchEvent(
          new Event("storage")
        );

        navigate("/login");
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error("Signup error:", err);
      alert("Signup failed");
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
            0 0 0 3px rgba(22, 163, 74, 0.13) !important;
        }

        /* CREATE ACCOUNT BUTTON */

        .bw-auth-btn:hover:not(:disabled) {
          background: #15803d !important;

          box-shadow:
            0 8px 22px rgba(22, 163, 74, 0.25) !important;

          transform: translateY(-1px);
        }

        .bw-auth-btn:active:not(:disabled) {
          transform: translateY(1px);

          box-shadow:
            0 4px 10px rgba(22, 163, 74, 0.18) !important;
        }

        .bw-auth-btn:disabled {
          opacity: 0.75;
          cursor: not-allowed;
        }

        /* LOGIN LINK */

        .bw-auth-toggle:hover {
          color: #15803d !important;
        }

        /* RESPONSIVE */

        @media (max-width: 850px) {
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

          .bw-auth-title {
            font-size: 26px !important;
          }
        }

      `}</style>


      <div
        className="bw-auth-card-shell"
        style={styles.cardShell}
      >


        {/* ====================================================
            LEFT PANEL
            ==================================================== */}

        <div
          className="bw-auth-left"
          style={styles.left}
        >

          {/* Top green blob */}

          <div
            style={{
              ...styles.blob,
              top: "-70px",
              right: "-50px",
              width: 220,
              height: 220,
            }}
          />


          {/* Bottom lime blob */}

          <div
            style={{
              ...styles.blob,
              bottom: "-80px",
              left: "-30px",
              width: 190,
              height: 190,
              background: "#c8f26a",
              animationDelay: "-5s",
            }}
          />


          {/* Left content */}

          <div style={styles.leftInner}>

            {/* BRAND */}

            <div style={styles.brand}>
              Buy
              <span style={{ color: "#4ade80" }}>
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


        {/*RIGHT FORM PANEL*/}

        <div
          className="bw-auth-right"
          style={styles.right}
        >

          <div style={styles.formInner}>

            {/* FREE TO JOIN */}

            <div style={styles.pill}>
              <span style={styles.pillDot} />
              Free to join
            </div>


            {/* TITLE */}

            <h2
              className="bw-auth-title"
              style={styles.title}
            >
              Create your account
            </h2>


            {/* SUBTITLE */}

            <p style={styles.subtitle}>
              Start tracking the best grocery
              prices today.
            </p>


            {/* FORM */}

            <form
              onSubmit={handleSignup}
              style={styles.form}
            >
              <div style={styles.fieldWrap}>

                <label
                  style={styles.label(
                    focusedField === "name" ||
                    name
                  )}
                >
                  Name
                </label>


                <input
                  className="bw-auth-input"
                  style={styles.input}
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  onFocus={() =>
                    setFocusedField("name")
                  }
                  onBlur={() =>
                    setFocusedField(null)
                  }
                  required
                />

              </div>


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

                <label
                  style={styles.label(
                    focusedField === "password" ||
                    password
                  )}
                >
                  Password
                </label>


                <input
                  className="bw-auth-input"
                  style={styles.input}
                  type="password"
                  placeholder="Create a password"
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

                    Creating account...

                  </span>

                ) : (

                  <span style={styles.buttonContent}>

                    <span>
                      Create Account
                    </span>

                    <span
                      style={styles.buttonArrow}
                    >
                      →
                    </span>

                  </span>

                )}

              </button>

            </form>

            <p style={styles.text}>

              Already have an account?{" "}

              <span
                className="bw-auth-toggle"
                style={styles.link}
                onClick={() =>
                  navigate("/login")
                }
              >
                Log in
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
    boxSizing: "border-box",

    display: "flex",
    justifyContent: "center",
    alignItems: "center",

    fontFamily:
      "Arial, sans-serif",

    background:
      "linear-gradient(135deg, #e7f5ec 0%, #f4f1ea 100%)",

    padding:
      "40px 24px",
  },


  
  cardShell: {
    display: "flex",

    width: "100%",
    maxWidth: "1000px",

    minHeight: "560px",

    borderRadius: "24px",

    overflow: "hidden",

    boxShadow:
      "0 30px 80px rgba(11,42,32,0.18)",

    background: "#fff",

    animation:
      "bwCardIn 0.35s ease",
  },


  left: {
    position: "relative",

    flex:
      "0 0 52%",

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
    position: "absolute",

    borderRadius:
      "50%",

    background:
      "#4ade80",

    filter:
      "blur(60px)",

    opacity:
      0.35,

    animation:
      "bwBlobFloat 14s ease-in-out infinite",
  },


  leftInner: {
    position: "relative",

    zIndex: 2,

    width: "100%",

    boxSizing:
      "border-box",

    padding:
      "52px 46px",
  },

  brand: {
    fontSize:
      "24px",

    fontWeight:
      700,

    color:
      "#fff",

    marginBottom:
      "30px",

    letterSpacing:
      "-0.3px",
  },


  leftTitle: {
    fontSize:
      "22px",

    fontWeight:
      700,

    color:
      "#fff",

    lineHeight:
      1.35,

    marginTop:
      0,

    marginBottom:
      "25px",

    maxWidth:
      "400px",
  },


  checklist: {
    listStyle:
      "none",

    padding:
      0,

    margin:
      "0 0 34px",

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
      "11px",

    fontSize:
      "15px",

    color:
      "rgba(255,255,255,0.9)",

    lineHeight:
      1.45,
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
      "13px",

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
      "30px",

    marginTop:
      "4px",
  },


  leftStat: {
    display:
      "flex",

    flexDirection:
      "column",
  },


  leftStatValue: {
    fontSize:
      "22px",

    fontWeight:
      700,

    color:
      "#4ade80",

    lineHeight:
      1.2,
  },


  leftStatLabel: {
    fontSize:
      "12px",

    color:
      "rgba(255,255,255,0.62)",

    marginTop:
      "5px",
  },


  right: {
    flex:
      "1 1 48%",

    display:
      "flex",

    justifyContent:
      "center",

    alignItems:
      "center",

    padding:
      "50px 58px",

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
    width:
      "100%",
  },


  pill: {
    display:
      "inline-flex",

    alignItems:
      "center",

    gap:
      "7px",

    background:
      "#d1fae5",

    color:
      "#166534",

    padding:
      "6px 13px",

    borderRadius:
      "999px",

    fontSize:
      "12px",

    fontWeight:
      700,

    marginBottom:
      "17px",
  },


  pillDot: {
    width:
      "7px",

    height:
      "7px",

    borderRadius:
      "50%",

    background:
      "#16a34a",
  },


  title: {
    fontSize:
      "30px",

    fontWeight:
      700,

    color:
      "#111827",

    marginTop:
      0,

    marginBottom:
      "7px",

    lineHeight:
      1.2,
  },


  subtitle: {
    fontSize:
      "15px",

    color:
      "#6b7280",

    marginTop:
      0,

    marginBottom:
      "30px",

    lineHeight:
      1.5,
  },

  fieldWrap: {
    marginBottom:
      "19px",

    textAlign:
      "left",
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

    minHeight:
      "50px",

    padding:
      "14px 18px",

    background:
      "#16a34a",

    color:
      "#fff",

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
      "5px",

    transition:
      "background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease",

    boxShadow:
      "0 4px 12px rgba(22,163,74,0.14)",
  },


  buttonContent: {
    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    gap:
      "7px",
  },


  buttonArrow: {
    fontSize:
      "18px",

    lineHeight:
      1,

    marginTop:
      "-1px",
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
      "21px",

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