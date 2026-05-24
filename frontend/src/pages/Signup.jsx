import { Link, Navigate, useNavigate } from "react-router-dom";
import { useState } from "react";

import AuthBackground from "../components/AuthBackground.jsx";
import { useAuth } from "../context/AuthContext.jsx";


export default function Signup() {
  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (form.password !== form.confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await signup({
        name: form.name,
        company: form.company,
        email: form.email,
        password: form.password,
      });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to create account right now");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <AuthBackground />

      <main className="login-container">
        <section className="glass-panel" aria-labelledby="signup-title">
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
            <h1 id="signup-title">DependGuard</h1>
          </div>

          <p className="subtitle">Create your dependency security workspace.</p>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Tanmay Varma"
                required
                value={form.name}
                onChange={updateField}
              />
            </div>
            <div className="input-group">
              <label htmlFor="company">Company</label>
              <input
                type="text"
                id="company"
                name="company"
                placeholder="DependGuard Workspace"
                value={form.company}
                onChange={updateField}
              />
            </div>
            <div className="input-group">
              <label htmlFor="signupEmail">Work Email</label>
              <input
                type="email"
                id="signupEmail"
                name="email"
                placeholder="security@yourcompany.com"
                required
                autoComplete="email"
                value={form.email}
                onChange={updateField}
              />
            </div>
            <div className="input-group">
              <label htmlFor="signupPassword">Password</label>
              <input
                type="password"
                id="signupPassword"
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
                placeholder="Repeat your password"
                required
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={updateField}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </button>
            <p className="auth-message" role="status" aria-live="polite">
              {message}
            </p>
          </form>

          <p className="signup-link">
            <span>Already have an account?</span>
            <Link to="/login">Sign in</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
