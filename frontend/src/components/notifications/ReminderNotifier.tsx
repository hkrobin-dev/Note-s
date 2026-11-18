"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AlarmClock, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { playNotificationSound } from "@/lib/notification-sound";

const POLL_MS = 30_000;
const NOTIFIED_KEY = "mylifeos_notified_reminders";

type Reminder = { id: string; message: string; scheduledAt: string };

function notifiedIds(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? "[]")); } catch { return new Set(); }
}
function markNotified(id: string) {
  if (typeof localStorage === "undefined") return;
  const ids = notifiedIds(); ids.add(id);
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...ids]));
}

/**
 * Polls pending reminders and surfaces the due ones as an in-app stack
 * (works even without browser notification permission). Browser
 * notifications are additionally sent when the user has granted permission.
 */
export function ReminderNotifier() {
  const pathname = usePathname();
  const [due, setDue] = useState<Reminder[]>([]);
  const permissionRef = useRef<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      permissionRef.current = Notification.permission;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const data = await api.reminders.list({ status: "PENDING" });
        if (cancelled) return;
        const now = Date.now();
        const dueList = ((data.reminders ?? []) as Reminder[]).filter(
          (r) => +new Date(r.scheduledAt) <= now,
        );
        setDue(dueList);

        if (permissionRef.current === "granted") {
          const ids = notifiedIds();
          for (const r of dueList) {
            if (ids.has(r.id)) continue;
            playNotificationSound();
            try {
              new Notification(`My Life OS — ${r.message}`, {
                body: `Scheduled for ${new Date(r.scheduledAt).toLocaleString()}`,
                icon: "/icon-192.png",
                tag: r.id,
              });
            } catch { /* ignore */ }
            markNotified(r.id);
          }
        }
      } catch { /* keep polling quietly */ }
    };

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  async function snooze(r: Reminder) {
    const when = new Date(Date.now() + 10 * 60_000);
    setDue((list) => list.filter((x) => x.id !== r.id));
    try {
      await api.reminders.update(r.id, { scheduledAt: when.toISOString() });
    } catch { /* will reappear if the update failed */ }
  }

  async function dismiss(r: Reminder) {
    setDue((list) => list.filter((x) => x.id !== r.id));
    try {
      await api.reminders.update(r.id, { status: "SENT" });
    } catch { /* ignore */ }
  }

  if (pathname === "/login" || pathname === "/register") return null;
  if (due.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[19rem] max-w-[calc(100vw-2rem)] space-y-2">
      {due.map((r) => (
        <div key={r.id} className="glass rounded-2xl border border-accent/40 shadow-2xl p-3">
          <div className="flex items-start gap-2.5">
            <div className="size-8 rounded-xl grid place-items-center bg-accent/15 text-accent shrink-0">
              <AlarmClock size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-ink leading-snug">{r.message}</div>
              <div className="text-[10px] text-ink-3 tabular mt-0.5">
                {new Date(r.scheduledAt).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 justify-end">
            <button
              onClick={() => snooze(r)}
              className="text-[10px] px-2 py-1 rounded-lg border border-line text-ink-3 hover:text-ink"
            >
              Snooze 10m
            </button>
            <button
              onClick={() => dismiss(r)}
              className="text-[10px] px-2 py-1 rounded-lg border border-line text-ink-2 hover:text-emerald-400 inline-flex items-center gap-1"
            >
              <CheckCircle2 size={11} /> Done
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
