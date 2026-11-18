// Language configuration for the app-wide Bangla / English toggle.

export type Locale = "en" | "bn";

export const DEFAULT_LOCALE: Locale = "en";

/** Persisted in both a cookie (for SSR-friendly reads) and localStorage. */
export const LOCALE_COOKIE = "my-life-os-locale";
export const LOCALE_STORAGE_KEY = "my-life-os-locale";

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "bn";
}

/** BCP-47 tags used for date, number, and currency formatting. */
export const INTL_LOCALE: Record<Locale, string> = {
  en: "en-GB",
  bn: "bn-BD",
};

export const LOCALE_LABEL: Record<Locale, string> = {
  en: "English",
  bn: "বাংলা",
};

export const LOCALES: { value: Locale; label: string; short: string }[] = [
  { value: "en", label: "English", short: "EN" },
  { value: "bn", label: "বাংলা", short: "বাং" },
];
