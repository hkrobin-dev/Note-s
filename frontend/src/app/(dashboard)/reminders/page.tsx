"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Bell, Plus, Trash2, Clock, CheckCircle2, AlarmClock, X } from "lucide-react";

type Reminder = {
  id: string;
  scheduledAt: string;
  message: string;
  status: "PENDING" | "SENT" | "FAILED" | "CANCELLED";
  channel: "APP" | "BROWSER" | "EMAIL";
  createdAt: string;
  task?: { id: string; title: string } | null;
  event?: { id: string; title: string } | null;
};

const CHANNELS = ["APP", "BROWSER", "EMAIL"] as const;

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function inMinutes(n: number) {
  return toLocalInput(new Date(Date.now() + n * 60_000));
}

function tomorrowAt(hour: number) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return toLocalInput(d);
}

function relative(iso: string) {
  const target = new Date(iso).getTime();
  const diff = target - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  const label = mins < 60 ? `${mins}m` : hours < 24 ? `${hours}h` : `${days}d`;
  return diff >= 0 ? `in ${label}` : `${label} ago`;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"PENDING" | "SENT" | "ALL">("PENDING");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    message: "",
    scheduledAt: inMinutes(30),
    channel: "APP" as Reminder["channel"],
  });

  async function load() {
    setLoading(true);
    try {
      const d = await api.reminders.list();
      setReminders((d.reminders ?? []) as Reminder[]);
    } catch (e) {
      console.error(e);
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") setOpen(true);
  }, []);

  const visible = useMemo(() => {
    const list = tab === "ALL" ? reminders : reminders.filter((r) => r.status === tab);
    return [...list].sort((a, b) => {
      if (a.status === "PENDING" && b.status !== "PENDING") return -1;
      if (b.status === "PENDING" && a.status !== "PENDING") return 1;
      return +new Date(a.scheduledAt) - +new Date(b.scheduledAt);
    });
  }, [reminders, tab]);

  const pendingCount = reminders.filter((r) => r.status === "PENDING").length;
  const overdueCount = reminders.filter(
    (r) => r.status === "PENDING" && +new Date(r.scheduledAt) <= Date.now(),
  ).length;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.message.trim() || !form.scheduledAt) return;
    setSaving(true);
    try {
      await api.reminders.create({
        message: form.message.trim(),
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        channel: form.channel,
      });
      setOpen(false);
      setForm({ message: "", scheduledAt: inMinutes(30), channel: "APP" });
      await load();
    } catch (err: any) {
      alert(err?.message || "Failed to create reminder");
    } finally {
      setSaving(false);
    }
  }

  async function patch(r: Reminder, body: any) {
    try {
      await api.reminders.update(r.id, body);
      await load();
    } catch (err: any) {
      alert(err?.message || "Failed to update reminder");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this reminder?")) return;
    try {
      await api.reminders.remove(id);
      await load();
    } catch (err: any) {
      alert(err?.message || "Failed to delete reminder");
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Reminders</h1>
          <p className="text-xs text-ink-3 mt-1">
            {pendingCount === 0
              ? "Nothing pending. Add a reminder so you do not forget."
              : `${pendingCount} pending${overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}.`}
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary text-sm inline-flex items-center gap-2">
          <Plus size={16} /> New reminder
        </button>
      </div>

      <div className="flex gap-1 rounded-xl border border-line p-1 bg-glass w-fit mb-5">
        {([
          ["PENDING", "Upcoming"],
          ["SENT", "Done"],
          ["ALL", "All"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 text-xs rounded-lg ${tab === key ? "bg-accent text-white" : "text-ink-2 hover:bg-glass-hover"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-6 text-sm text-ink-3">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Bell className="mx-auto text-ink-3" size={26} />
          <div className="text-sm text-ink-2 font-medium mt-2">
            {tab === "PENDING" ? "No upcoming reminders" : "Nothing here"}
          </div>
          <div className="text-xs text-ink-3 mt-1">Create one with the New reminder button.</div>
        </div>
      ) : (
        <div className="grid gap-3">
          {visible.map((r) => {
            const overdue = r.status === "PENDING" && +new Date(r.scheduledAt) <= Date.now();
            return (
              <div
                key={r.id}
                className={`glass rounded-2xl border p-4 flex items-start gap-3 ${overdue ? "border-red-400/40" : "border-white/10"}`}
              >
                <div className={`size-9 rounded-xl grid place-items-center shrink-0 ${overdue ? "bg-red-400/15 text-red-300" : "bg-white/5 text-accent"}`}>
                  {r.status === "PENDING" ? <AlarmClock size={17} /> : <CheckCircle2 size={17} className="text-emerald-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium ${r.status === "SENT" ? "line-through opacity-70 text-ink" : "text-ink"}`}>
                    {r.message}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-3">
                    <span className="tabular">
                      {new Date(r.scheduledAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {r.status === "PENDING" && (
                      <span className={overdue ? "text-red-300 font-semibold" : ""}>{relative(r.scheduledAt)}</span>
                    )}
                    <span className="rounded-full border border-line px-1.5 py-0.5 uppercase tracking-wider text-[9px]">{r.channel}</span>
                    {r.task && <span className="truncate">Task: {r.task.title}</span>}
                    {r.event && <span className="truncate">Event: {r.event.title}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {r.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => {
                          const d = new Date();
                          d.setMinutes(d.getMinutes() + 10);
                          patch(r, { scheduledAt: d.toISOString() });
                        }}
                        className="text-[10px] px-2 py-1 rounded-lg border border-line text-ink-3 hover:text-ink"
                        title="Snooze 10 minutes"
                      >
                        +10m
                      </button>
                      <button
                        onClick={() => patch(r, { status: "SENT" })}
                        className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-emerald-400"
                        title="Mark done"
                      >
                        <CheckCircle2 size={15} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => remove(r.id)}
                    className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0f1a] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-ink">New reminder</h2>
              <button onClick={() => setOpen(false)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={create} className="space-y-3">
              <input
                autoFocus
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Remind me to…"
                className="input-glass text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-ink-3">When</label>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                    className="input-glass text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-ink-3">Channel</label>
                  <select
                    value={form.channel}
                    onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as Reminder["channel"] }))}
                    className="input-glass text-sm mt-1"
                  >
                    {CHANNELS.map((c) => (
                      <option key={c} value={c} className="bg-[#0b0f1a]">{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  ["+15m", inMinutes(15)],
                  ["+1h", inMinutes(60)],
                  ["Tonight 8pm", (() => { const d = new Date(); d.setHours(20, 0, 0, 0); return toLocalInput(d); })()],
                  ["Tomorrow 9am", tomorrowAt(9)],
                ].map(([label, value]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, scheduledAt: value as string }))}
                    className="text-[10px] px-2 py-1 rounded-lg border border-line text-ink-3 hover:text-ink"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-sm inline-flex items-center gap-2">
                  <Clock size={14} /> {saving ? "Saving…" : "Create reminder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
