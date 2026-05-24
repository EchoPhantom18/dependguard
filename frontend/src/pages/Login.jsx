import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";

import AuthBackground from "../components/AuthBackground.jsx";
import { BACKEND_BASE_URL } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";


export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "", remember: true });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "oauth_failed") {
      const reason = searchParams.get("reason");
      const devReason = import.meta.env.DEV && reason ? ` Reason: ${reason}` : "";
      setMessage(`OAuth sign in failed. Please try again or use email and password.${devReason}`);
    }
  }, [searchParams]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      await login({ email: form.email, password: form.password });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to sign in right now");
    } finally {
      setLoading(false);
    }
  }

  function startOAuth(provider) {
    window.location.href = `${BACKEND_BASE_URL}/auth/${provider}/login`;
  }

  return (
    <div className="auth-page">
      <AuthBackground />

      <main className="login-container">
        {/* Existing login page design lives here. Paste your screenshot-matched JSX inside this section if you want to replace the converted markup, and keep the form onSubmit plus email/password bindings connected to handleSubmit. */}
        <section className="glass-panel" aria-labelledby="auth-title">
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
            <h1 id="auth-title">DependGuard</h1>
          </div>

          <p id="authSubtitle" className="subtitle">
            AI-powered dependency vulnerability analysis. Secure your packages today.
          </p>

          <form id="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">Work Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="security@yourcompany.com"
                required
                autoComplete="email"
                value={form.email}
                onChange={updateField}
              />
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={updateField}
              />
            </div>

            <div className="form-actions">
              <label className="remember-me">
                <input
                  id="rememberMe"
                  type="checkbox"
                  name="remember"
                  checked={form.remember}
                  onChange={updateField}
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="forgot-password">
                Forgot password?
              </Link>
            </div>

            <button id="authButton" type="submit" className="login-btn" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </button>
            <p id="authMessage" className="auth-message" role="status" aria-live="polite">
              {message}
            </p>
          </form>

          <div className="divider">
            <span>or continue with</span>
          </div>

          <button className="github-btn" type="button" data-provider="Google" onClick={() => startOAuth("google")}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
            Continue with Google
          </button>
          <button className="github-btn" type="button" data-provider="GitHub" onClick={() => startOAuth("github")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Continue with GitHub
          </button>
          <p className="signup-link">
            <span id="modePrompt">Don't have an account?</span>
            <Link id="modeToggle" to="/signup">
              Create an account
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
