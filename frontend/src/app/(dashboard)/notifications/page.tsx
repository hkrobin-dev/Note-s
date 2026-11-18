"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { Bell, Clock, Inbox, Trash2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast/toaster";

type Notification = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read: boolean;
  createdAt: string;
};

const ICONS: Record<string, any> = { REMINDER: Clock, TASK: CheckCircle2, SYSTEM: Bell, EXPENSE: Inbox };
const TYPE_FILTERS = ["ALL", "REMINDER", "TASK", "SYSTEM", "EXPENSE"] as const;

export default function NotificationsPage() {
  const { toast } = useToast();
  const [list, setList] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>("ALL");

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try {
      const d: any = await api.notifications.list();
      setList(d.notifications ?? []);
      setUnreadCount(d.unreadCount ?? 0);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }
  async function markRead(id: string) {
    try {
      await api.notifications.markRead(id);
      setList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      toast({ title: "Marked as read" });
    } catch (err) {
      toast({ title: "Could not mark read", description: (err as Error)?.message });
    }
  }
  async function markAll() {
    try {
      await api.notifications.markReadAll();
      setList((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast({ title: "All notifications marked read" });
    } catch (err) {
      toast({ title: "Could not mark all read", description: (err as Error)?.message });
    }
  }
  async function remove(id: string) {
    const target = list.find((n) => n.id === id);
    try {
      await api.notifications.remove(id);
      setList((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.read) setUnreadCount((c) => Math.max(0, c - 1));
      toast({ title: "Notification deleted" });
    } catch (err) {
      toast({ title: "Could not delete notification", description: (err as Error)?.message });
    }
  }

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: list.length };
    for (const n of list) counts[n.type] = (counts[n.type] ?? 0) + 1;
    return counts;
  }, [list]);

  const visible = useMemo(
    () =>
      list.filter((n) => {
        if (statusFilter === "unread" && n.read) return false;
        if (typeFilter !== "ALL" && n.type !== typeFilter) return false;
        return true;
      }),
    [list, statusFilter, typeFilter],
  );

  return (
    <div className="page-wrap py-8">
      <div className="flex flex-col items-center gap-4 mb-8 text-center">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Notifications</h1>
          <p className="text-xs text-ink-3">
            All your reminders and activity alerts.{unreadCount > 0 ? ` ${unreadCount} unread.` : " You're all caught up."}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAll} className="btn-ghost text-sm px-3 py-1.5">
            Mark all read ({unreadCount})
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="inline-flex rounded-xl border border-line overflow-hidden">
          {(["all", "unread"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                statusFilter === s ? "bg-accent text-white" : "text-ink-3 hover:text-ink hover:bg-glass-hover",
              )}
            >
              {s}
              {s === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
                typeFilter === t ? "border-accent text-accent bg-accent/10" : "border-line text-ink-3 hover:text-ink",
              )}
            >
              {t === "ALL" ? "All types" : t[0] + t.slice(1).toLowerCase()}
              {typeCounts[t] ? ` ${typeCounts[t]}` : ""}
            </button>
          ))}
        </div>
      </div>

      <GlassPanel className="overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line/60">
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Type</th>
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Notification</th>
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Time</th>
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Status</th>
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-xs text-ink-3">Loading…</td></tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-xs text-ink-3">
                    {list.length === 0
                      ? "No notifications yet."
                      : "No notifications match these filters."}
                  </td>
                </tr>
              ) : (
                visible.map((n) => {
                  const Icon = ICONS[n.type] || Inbox;
                  return (
                    <tr key={n.id} className={cn("group hover:bg-glass-hover transition-colors", n.read && "bg-glass/30")}>
                      <td className="px-5 py-4">
                        <div className="grid glass-interactive size-7 rounded-lg place-items-center">
                          <Icon size={14} className="text-accent" />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {n.link ? (
                          <Link
                            href={n.link}
                            onClick={() => { if (!n.read) markRead(n.id); }}
                            className={cn("text-sm font-medium leading-tight hover:underline", n.read ? "text-ink-3" : "text-ink")}
                          >
                            {n.title}
                          </Link>
                        ) : (
                          <div className={cn("text-sm font-medium leading-tight", n.read ? "text-ink-3" : "text-ink")}>{n.title}</div>
                        )}
                        {n.body && <div className="text-[10px] text-ink-3 mt-0.5 line-clamp-1">{n.body}</div>}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-ink-3 tabular">
                          {new Date(n.createdAt).toLocaleDateString()}{" "}
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                            n.read ? "border-line text-ink-3 bg-glass" : "border-accent text-accent bg-accent/10",
                          )}
                        >
                          {n.read ? "Read" : "New"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {!n.read && (
                            <button
                              onClick={() => markRead(n.id)}
                              className="glass-interactive size-7 grid place-items-center rounded-lg text-accent"
                              title="Mark read"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => remove(n.id)}
                            className="glass-interactive size-7 grid place-items-center rounded-lg text-ink-3 hover:text-error"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
}
