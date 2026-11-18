"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Plus, ChevronLeft, ChevronRight, Trash2, MapPin, Clock, X, Pencil } from "lucide-react";
import { useToast } from "@/components/toast/toaster";

type Event = {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt?: string | null;
  allDay: boolean;
  eventType: string;
  location?: string | null;
};

const EVENT_COLORS: Record<string, string> = {
  GENERAL: "bg-accent/20 text-accent border-accent/40",
  MEETING: "bg-violet-400/20 text-violet-300 border-violet-400/40",
  DEADLINE: "bg-red-400/20 text-red-300 border-red-400/40",
  PERSONAL: "bg-emerald-400/20 text-emerald-300 border-emerald-400/40",
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function CalendarPage() {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month" | "week" | "list">("month");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startAt: toLocalInput(new Date()),
    endAt: toLocalInput(new Date(Date.now() + 3600_000)),
    allDay: false,
    eventType: "GENERAL",
    location: "",
  });

  async function load() {
    setLoading(true);
    try {
      const d = await api.calendar.list();
      setEvents(
        ((d.events ?? []) as Event[]).sort(
          (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
        ),
      );
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") openCreate();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const today = useMemo(() => startOfDay(new Date()), []);

  const monthStart = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor]);
  const gridStart = useMemo(() => {
    const dow = (monthStart.getDay() + 6) % 7; // Monday-first
    return addDays(monthStart, -dow);
  }, [monthStart]);
  const monthCells = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)), [gridStart]);

  const weekStart = useMemo(() => {
    const dow = (cursor.getDay() + 6) % 7;
    return addDays(startOfDay(cursor), -dow);
  }, [cursor]);
  const weekCells = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  function eventsFor(day: Date) {
    return events.filter((e) => sameDay(new Date(e.startAt), day));
  }

  function openCreate(day?: Date) {
    const base = day ? new Date(day) : new Date();
    if (day) {
      const now = new Date();
      base.setHours(day.toDateString() === now.toDateString() ? now.getHours() + 1 : 9, 0, 0, 0);
    }
    setEditing(null);
    setForm({
      title: "",
      description: "",
      startAt: toLocalInput(base),
      endAt: toLocalInput(new Date(base.getTime() + 3600_000)),
      allDay: false,
      eventType: "GENERAL",
      location: "",
    });
    setOpen(true);
  }

  function openEdit(e: Event) {
    setEditing(e);
    setForm({
      title: e.title,
      description: e.description ?? "",
      startAt: toLocalInput(new Date(e.startAt)),
      endAt: toLocalInput(new Date(e.endAt ?? e.startAt)),
      allDay: e.allDay,
      eventType: e.eventType,
      location: e.location ?? "",
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.startAt) return;
    setSaving(true);
    const body = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt || form.startAt).toISOString(),
      allDay: form.allDay,
      eventType: form.eventType,
      location: form.location.trim() || null,
    };
    try {
      if (editing) await api.calendar.update(editing.id, body);
      else await api.calendar.create(body);
      setOpen(false);
      setEditing(null);
      await load();
      toast({ title: editing ? "Event updated" : "Event created" });
    } catch (err: any) {
      toast({ title: "Could not save event", description: err?.message ?? "Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this event?")) return;
    try {
      await api.calendar.remove(id);
      await load();
      toast({ title: "Event deleted", description: "Your event has been removed" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete event: " + (err as Error)?.message });
    }
  }

  const headerLabel = view === "month"
    ? cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : `Week of ${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  function shift(n: number) {
    if (view === "month") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));
    else setCursor(addDays(cursor, n * 7));
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="mb-5 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Calendar</h1>
          <p className="text-xs text-ink-3 mt-1">Schedule events and see your month at a glance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl border border-line p-1 bg-glass">
            {(["month", "week", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs rounded-lg ${view === v ? "bg-accent text-white" : "text-ink-2 hover:bg-glass-hover"}`}
              >
                {v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={() => openCreate()} className="btn-primary text-sm inline-flex items-center gap-2">
            <Plus size={16} /> New event
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="size-8 grid place-items-center rounded-lg border border-line text-ink-2 hover:bg-glass-hover" aria-label="Previous">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setCursor(startOfDay(new Date()))} className="px-3 py-1.5 text-xs rounded-lg border border-line text-ink-2 hover:bg-glass-hover">
            Today
          </button>
          <button onClick={() => shift(1)} className="size-8 grid place-items-center rounded-lg border border-line text-ink-2 hover:bg-glass-hover" aria-label="Next">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="text-sm font-semibold text-ink">{headerLabel}</div>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-6 text-sm text-ink-3">Loading…</div>
      ) : view === "month" ? (
        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-white/10">
            {DAY_LABELS.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-ink-3">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr">
            {monthCells.map((day) => {
              const inMonth = day.getMonth() === cursor.getMonth();
              const isToday = sameDay(day, today);
              const dayEvents = eventsFor(day);
              return (
                <div
                  key={day.toISOString()}
                  role="button"
                  tabIndex={0}
                  onClick={() => openCreate(day)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      openCreate(day);
                    }
                  }}
                  className={`min-h-[96px] cursor-pointer border-b border-r border-white/5 p-1.5 text-left align-top transition-colors hover:bg-glass-hover ${inMonth ? "" : "opacity-40"}`}
                >
                  <div className={`text-[11px] tabular mb-1 size-6 grid place-items-center rounded-full ${isToday ? "bg-accent text-white font-bold" : "text-ink-2"}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map((e) => (
                      <button
                        key={e.id}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          openEdit(e);
                        }}
                        className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] border ${EVENT_COLORS[e.eventType] ?? EVENT_COLORS.GENERAL}`}
                        title={`${e.title}${e.allDay ? "" : ` · ${timeLabel(e.startAt)}`}`}
                      >
                        {!e.allDay && <span className="opacity-70 tabular">{timeLabel(e.startAt)} </span>}
                        {e.title}
                      </button>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-ink-3 pl-1">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : view === "week" ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {weekCells.map((day) => {
            const isToday = sameDay(day, today);
            const dayEvents = eventsFor(day);
            return (
              <div key={day.toISOString()} className={`glass rounded-xl border p-2.5 min-h-[140px] ${isToday ? "border-accent/50" : "border-white/10"}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-ink-3">{day.toLocaleDateString(undefined, { weekday: "short" })}</span>
                  <span className={`text-[11px] tabular size-5 grid place-items-center rounded-full ${isToday ? "bg-accent text-white font-bold" : "text-ink-2"}`}>{day.getDate()}</span>
                </div>
                <div className="space-y-1">
                  {dayEvents.length === 0 ? (
                    <button onClick={() => openCreate(day)} className="w-full text-[10px] text-ink-3 hover:text-ink text-left">+ Add</button>
                  ) : (
                    dayEvents.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => openEdit(e)}
                        className={`w-full text-left rounded px-1.5 py-1 text-[10px] border ${EVENT_COLORS[e.eventType] ?? EVENT_COLORS.GENERAL}`}
                        title="Edit event"
                      >
                        <div className="truncate font-medium">{e.title}</div>
                        <div className="opacity-70 tabular">{e.allDay ? "All day" : timeLabel(e.startAt)}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          <div className="divide-y divide-white/10">
            {events.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-3">No events scheduled.</div>
            ) : (
              events.map((e) => (
                <div key={e.id} className="px-4 py-3 flex items-center gap-3 hover:bg-glass-hover transition-colors">
                  <div className="w-14 shrink-0">
                    <div className="text-sm text-ink tabular">{new Date(e.startAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                    <div className="text-[10px] text-ink-3 tabular">{e.allDay ? "All day" : timeLabel(e.startAt)}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-ink truncate">{e.title}</div>
                    <div className="flex items-center gap-3 text-[10px] text-ink-3">
                      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 ${EVENT_COLORS[e.eventType] ?? EVENT_COLORS.GENERAL}`}>{e.eventType}</span>
                      {e.location && <span className="inline-flex items-center gap-0.5"><MapPin size={10} /> {e.location}</span>}
                      {!e.allDay && e.endAt && <span className="inline-flex items-center gap-0.5"><Clock size={10} /> {timeLabel(e.startAt)}–{timeLabel(e.endAt)}</span>}
                    </div>
                  </div>
                  <button onClick={() => openEdit(e)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink" title="Edit event">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => remove(e.id)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-red-400" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setOpen(false); setEditing(null); }}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0f1a] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-ink">{editing ? "Edit event" : "New event"}</h3>
              <button onClick={() => { setOpen(false); setEditing(null); }} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={save} className="space-y-3">
              <div className="grid grid-cols-[1fr_120px] gap-3">
                <input autoFocus value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Title" className="input-glass text-sm" />
                <select value={form.eventType} onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))} className="input-glass text-sm">
                  <option value="GENERAL" className="bg-[#0b0f1a]">General</option>
                  <option value="MEETING" className="bg-[#0b0f1a]">Meeting</option>
                  <option value="DEADLINE" className="bg-[#0b0f1a]">Deadline</option>
                  <option value="PERSONAL" className="bg-[#0b0f1a]">Personal</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-ink-3">Starts</label>
                  <input type="datetime-local" value={form.startAt} onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))} className="input-glass text-sm mt-1" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-ink-3">Ends</label>
                  <input type="datetime-local" value={form.endAt} onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))} className="input-glass text-sm mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Location (optional)" className="input-glass text-sm" />
                <label className="flex items-center gap-2 text-xs text-ink-2 pb-2 cursor-pointer">
                  <input type="checkbox" checked={form.allDay} onChange={(e) => setForm((f) => ({ ...f, allDay: e.target.checked }))} /> All day
                </label>
              </div>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Notes (optional)" className="input-glass text-sm resize-y" />
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => { setOpen(false); setEditing(null); }} className="btn-ghost text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? "Saving…" : editing ? "Save changes" : "Create event"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
