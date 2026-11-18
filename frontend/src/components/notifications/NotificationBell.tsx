"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { api } from "@/lib/api";

const POLL_MS = 30_000;
const NOTIFIED_KEY = "mylifeos_notified_reminders";

function notifiedIds(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? "[]")); } catch { return new Set(); }
}
function markNotified(id: string) {
  if (typeof localStorage === "undefined") return;
  const ids = notifiedIds(); ids.add(id);
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...ids]));
}

export function NotificationBell() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (permission === "default") {
      Notification.requestPermission().then(setPermission);
    }
  }, []);

  useEffect(() => {
    if (permission !== "granted") return;
    let t: ReturnType<typeof setInterval>;
    const poll = async () => {
      try {
        const data = await api.notifications.list({ unreadOnly: "true" });
        setUnread(data.unreadCount ?? 0);
        const ids = notifiedIds();
        for (const n of data.notifications ?? []) {
          if (!n.read && !ids.has(n.id)) {
            new Notification(n.title, { body: n.body, icon: "/icon-192.png" });
            markNotified(n.id);
          }
        }
      } catch { /* ignore */ }
    };
    poll();
    t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, [permission]);

  if (permission === "denied") return <button className="text-xs text-ink-3" title="Notifications disabled">{<BellOff size={16} />}</button>;

  return (
    <button
      className="relative glass-interactive size-10 rounded-xl place-items-center text-ink-2"
      aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
      title={unread > 0 ? `${unread} new notifications` : "Notifications"}
    >
      <Bell size={20} className={unread > 0 ? "text-accent animate-ping" : "text-ink-3"} />
      {unread > 0 && (
        <span className="absolute top-1 right-1 size-2.5 rounded-full bg-error text-[10px] font-bold text-white shadow-md" />
      )}
    </button>
  );
}
