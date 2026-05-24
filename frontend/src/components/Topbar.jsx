import { LogOut, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";

import ThemeToggle from "./ThemeToggle.jsx";
import { useAuth } from "../context/AuthContext.jsx";


export default function Topbar({ onMenuClick = () => {} }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="topbar-shell sticky top-0 z-20 border-b px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-300/20 lg:hidden"
            title="Open sidebar"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
          <div>
            <p className="theme-heading text-sm font-semibold">Security Command Center</p>
            <p className="theme-muted text-xs">{user?.company || "DependGuard Workspace"}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            className="theme-button inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:border-rose-300/40 hover:bg-rose-400/10 hover:text-rose-500"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
