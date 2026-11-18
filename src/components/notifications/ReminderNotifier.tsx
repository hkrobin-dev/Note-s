"use client";

import { useEffect, useState, useRef } from "react";
import { playNotificationSound } from "@/lib/notification-sound";

const POLL_INTERVAL_MS = 30_000;
const NOTIFIED_KEY = "mylifeos_notified_reminders";

function notifiedIds(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function markNotified(id: string) {
  if (typeof localStorage === "undefined") return;
  const ids = notifiedIds();
  ids.add(id);
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...ids]));
}

export function ReminderNotifier() {
  // Start from "default" so the hydration render matches the server output;
  // the real permission is read from the browser only after mount.
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync with a browser API after mount
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    if (permission === "default") {
      Notification.requestPermission().then((p) => setPermission(p));
    }

    const poll = async () => {
      if (permission !== "granted") return;
      try {
        const res = await fetch("/api/reminders?status=SENT&limit=50", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { reminders: { id: string; message: string; scheduledAt: string }[] };
        const ids = notifiedIds();
        for (const r of data.reminders) {
          if (ids.has(r.id)) continue;
          playNotificationSound();
          new Notification(`My Life OS — ${r.message}`, {
            body: `Scheduled for ${new Date(r.scheduledAt).toLocaleString()}`,
            icon: "/icons/icon-192x192.png",
          });
          markNotified(r.id);
        }
      } catch {
        // Silently ignore poll failures
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [permission]);

  if (permission === "denied") return null;

  return (
    /* Lifted above the mobile bottom tab bar; sits bottom-right on desktop. */
    <div className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[60] lg:bottom-4">
      {permission === "granted" ? (
        <button
          onClick={() => {
            playNotificationSound();
            new Notification("My Life OS", { body: "Notifications enabled", icon: "/icons/icon-192x192.png" });
          }}
          className="rounded-full border border-line bg-surface/95 px-3.5 py-2 text-[11px] font-medium text-ink-2 shadow-[var(--shadow-card)] backdrop-blur transition-colors hover:text-ink"
        >
          Notifications active
        </button>
      ) : (
        <button
          onClick={() => {
            Notification.requestPermission().then((p) => setPermission(p));
          }}
          className="rounded-full border border-accent/40 bg-accent-soft px-3.5 py-2 text-[11px] font-medium text-accent shadow-[var(--shadow-card)] backdrop-blur transition-colors hover:bg-accent/20"
        >
          Enable notifications
        </button>
      )}
    </div>
  );
}

