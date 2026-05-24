import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";

import { BACKEND_BASE_URL } from "../api/client.js";
import AuthBackground from "../components/AuthBackground.jsx";


export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(`${BACKEND_BASE_URL}/auth/reset-password/${token}`, {
        password: form.password,
      });
      setMessage(data.message || "Password reset successful. You can now sign in.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to reset password right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <AuthBackground />
      <main className="login-container">
        <section className="glass-panel" aria-labelledby="reset-title">
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
            <h1 id="reset-title">DependGuard</h1>
          </div>

          <p className="subtitle">Choose a new password for your DependGuard account.</p>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                name="password"
                placeholder="At least 8 characters"
                required
                autoComplete="new-password"
                value={form.password}
                onChange={updateField}
              />
            </div>
            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Repeat your new password"
                required
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={updateField}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Resetting..." : "Reset password"}
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
