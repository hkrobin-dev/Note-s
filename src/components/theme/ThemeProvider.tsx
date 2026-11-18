"use client";

import { useCallback, useEffect } from "react";

type Theme = "light" | "dark";

const THEME_KEY = "my-life-os-theme";

/** Current theme, read from the DOM (<html data-theme>) — never from React state. */
function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** Persisted preference, falling back to the OS setting. */
function persistedTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  html.dataset.theme = theme;
  html.classList.remove("light", "dark");
  html.classList.add(theme);
  localStorage.setItem(THEME_KEY, theme);
}

/**
 * Theme provider without React state.
 *
 * The DOM is the single source of truth: styling is driven by CSS variables on
 * `<html data-theme>`, and any theme-dependent UI is handled in CSS (see the
 * `dark:` variant in globals.css). The persisted preference is applied once
 * after mount, so the hydration render always matches the server output —
 * reading localStorage during the initial render is what caused the previous
 * hydration mismatch.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme(persistedTheme());
  }, []);

  return children;
}

export function useTheme() {
  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(currentTheme() === "light" ? "dark" : "light");
  }, []);

  return { setTheme, toggleTheme };
}
