import { Moon, Sun } from "lucide-react";

import { useTheme } from "../context/ThemeContext.jsx";


export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className={`theme-toggle-icon ${!isDark ? "active" : ""}`}>
        <Sun size={15} />
      </span>
      <span className={`theme-toggle-icon ${isDark ? "active" : ""}`}>
        <Moon size={15} />
      </span>
      <span className="theme-toggle-thumb" />
    </button>
  );
}
