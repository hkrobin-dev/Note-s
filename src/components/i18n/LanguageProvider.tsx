"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  INTL_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  isLocale,
  type Locale,
} from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/dictionary";

type LanguageContextValue = {
  locale: Locale;
  intlLocale: string;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function applyLocale(locale: Locale) {
  const html = document.documentElement;
  html.lang = locale;
  html.dataset.locale = locale;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage can be unavailable (private mode); the toggle still works for this page.
  }
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

function persistedLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // ignore
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  if (match && isLocale(match[1])) return match[1];
  return DEFAULT_LOCALE;
}

/**
 * App-wide language state.
 *
 * The first render is always English (matching the server output) and the
 * persisted preference is applied after mount, mirroring ThemeProvider. This
 * avoids a hydration mismatch while still remembering the user's choice.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = persistedLocale();
    if (stored !== DEFAULT_LOCALE) {
      setLocaleState(stored);
      applyLocale(stored);
    } else {
      document.documentElement.lang = DEFAULT_LOCALE;
      document.documentElement.dataset.locale = DEFAULT_LOCALE;
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    applyLocale(next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((current) => {
      const next: Locale = current === "bn" ? "en" : "bn";
      applyLocale(next);
      return next;
    });
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      intlLocale: INTL_LOCALE[locale],
      setLocale,
      toggleLocale,
      t: (key, params) => translate(locale, key, params),
    }),
    [locale, setLocale, toggleLocale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

/** Convenience hook when a component only needs the translator. */
export function useT() {
  return useLanguage().t;
}
