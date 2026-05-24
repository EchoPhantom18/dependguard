import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import AuthBackground from "../components/AuthBackground.jsx";
import { useAuth } from "../context/AuthContext.jsx";


export default function OAuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeOAuth } = useAuth();
  const [message, setMessage] = useState("Completing secure sign in...");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      navigate("/login?error=oauth_failed&reason=missing_oauth_token", { replace: true });
      return;
    }

    completeOAuth(token)
      .then(() => navigate("/dashboard", { replace: true }))
      .catch(() => {
        setMessage("OAuth sign in failed. Redirecting...");
        navigate("/login?error=oauth_failed&reason=oauth_token_validation_failed", { replace: true });
      });
  }, [completeOAuth, navigate, searchParams]);

  return (
    <div className="auth-page">
      <AuthBackground />
      <main className="login-container">
        <section className="glass-panel" aria-live="polite">
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
            <h1>DependGuard</h1>
          </div>
          <p className="subtitle">{message}</p>
        </section>
      </main>
    </div>
  );
}
