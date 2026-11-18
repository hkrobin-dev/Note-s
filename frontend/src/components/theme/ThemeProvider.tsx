"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
const THEME_KEY = "mylifeos-theme";

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void; setTheme: (t: Theme) => void } | null>(null);

function getInitial(): Theme {
  if (typeof localStorage === "undefined") return "light";
  const s = localStorage.getItem(THEME_KEY) as Theme | null;
  if (s === "light" || s === "dark") return s;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

function apply(t: Theme) {
  const html = document.documentElement;
  html.dataset.theme = t;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always start as "light" so the server and the first client render match.
  // The persisted/preferred theme is applied in an effect right after hydration.
  const [theme, setThemeState] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setThemeState(getInitial());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    apply(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme, ready]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const toggleTheme = useCallback(() => setThemeState((p) => (p === "light" ? "dark" : "light")), []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
