"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ChevronRight, Clock, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationDropdown({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [list, setList] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    load();
  }, [open]);

  async function load() {
    setLoading(true);
    try {
      const data = await api.notifications.list();
      setList(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch { setList([]); }
    finally { setLoading(false); }
  }

  async function markRead(id: string) {
    try { await api.notifications.markRead(id); } catch {}
    setList(list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAll() {
    try { await api.notifications.markReadAll(); } catch {}
    setList(list.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-end p-4 pointer-events-none">
      <div className="pointer-events-auto glass-elevated w-full max-w-md mt-4 rounded-2xl border-b-0 border-r-0 overflow-hidden flex flex-col" style={{ minHeight: 420 }}>
        <div className="p-5 border-b border-line/60">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-ink">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAll} className="text-[10px] font-semibold text-accent hover:text-accent/80 underline">Mark all read</button>
            )}
          </div>
          <div className="text-xs text-ink-3">{list.length} notifications</div>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="p-5 text-center text-xs text-ink-3 animate-pulse">Loading…</div>
          ) : list.length === 0 ? (
            <div className="p-6 text-center">
              <Inbox size={28} className="mx-auto mb-2 text-ink-3" />
              <p className="text-xs text-ink-3">No notifications yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-line/60">
              {list.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { markRead(n.id); onClose(); }}
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-glass-hover border-b border-line/30 last:border-0"
                >
                  <div className="flex-shrink-0 glass-interactive size-8 rounded-lg place-items-center">
                    {n.type === "REMINDER" ? <Clock size={14} className="text-accent" /> : <Inbox size={14} className="text-ink-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-sm font-medium leading-tight", n.read ? "text-ink-3" : "text-ink")}>{n.title}</div>
                    {n.body && !n.read && <div className="text-[10px] text-ink-3 mt-0.5 truncate">{n.body}</div>}
                  </div>
                  {!n.read && <div className="size-2 rounded-full bg-accent" />}
                  <ChevronRight size={14} className="text-ink-3" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
