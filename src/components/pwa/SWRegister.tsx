"use client";

import { useEffect } from "react";

export function SWRegister() {
  useEffect(() => {
    // Skip in development — a caching service worker would serve stale dev
    // assets and make local changes appear to "not work".
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (registration.active) {
          // Check for updates periodically.
          const interval = setInterval(() => registration.update(), 60_000);
          // Stop checking if the page goes away.
          window.addEventListener("pagehide", () => clearInterval(interval), { once: true });
        }
      })
      .catch((err) => {
        console.warn("SW registration failed:", err);
      });
  }, []);

  return null;
}
