import axios from "axios";
import { Link } from "react-router-dom";
import { useState } from "react";

import { BACKEND_BASE_URL } from "../api/client.js";
import AuthBackground from "../components/AuthBackground.jsx";


export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const { data } = await axios.post(`${BACKEND_BASE_URL}/auth/forgot-password`, { email });
      setMessage(data.message || "If an account exists, a reset link has been sent.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to send reset link right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <AuthBackground />
      <main className="login-container">
        <section className="glass-panel" aria-labelledby="forgot-title">
          <div className="logo">
            <div className="logo-icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h1 id="forgot-title">DependGuard</h1>
          </div>

          <p className="subtitle">Enter your work email and we will send a secure password reset link.</p>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="resetEmail">Work Email</label>
              <input
                type="email"
                id="resetEmail"
                name="email"
                placeholder="security@yourcompany.com"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
            </button>

            <p className="auth-message" role="status" aria-live="polite">
              {error || message}
            </p>
          </form>

          <p className="signup-link">
            <Link to="/login">Back to sign in</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
