import { createContext, useContext, useEffect, useMemo, useState } from "react";


const ThemeContext = createContext(null);
const THEME_KEY = "dependguard_theme";


export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "dark");
  const [systemTheme, setSystemTheme] = useState(() =>
    window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
  const resolvedTheme = theme === "system" ? systemTheme : theme;
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mediaQuery) return undefined;

    function updateSystemTheme(event) {
      setSystemTheme(event.matches ? "dark" : "light");
    }

    setSystemTheme(mediaQuery.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", updateSystemTheme);
    return () => mediaQuery.removeEventListener("change", updateSystemTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.resolvedTheme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
    document.documentElement.classList.toggle("theme-light", resolvedTheme === "light");
    document.documentElement.classList.toggle("theme-dark", resolvedTheme === "dark");
  }, [theme, resolvedTheme]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      isDark,
      toggleTheme,
      setTheme,
    }),
    [theme, resolvedTheme, isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}


export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}
