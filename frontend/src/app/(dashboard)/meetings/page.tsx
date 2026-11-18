"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/toast/toaster";
import { confirmDialog } from "@/components/dialog/confirm";
import { CalendarClock, MapPin, Link2, Users, Plus, Trash2, CheckCircle2, ChevronDown, X, Pencil, Check, ListChecks } from "lucide-react";

type ActionItem = {
  id: string;
  meetingId: string;
  text: string;
  assignee?: string | null;
  dueDate?: string | null;
  done: boolean;
  createdAt: string;
};

type Meeting = {
  id: string;
  title: string;
  startAt: string;
  endAt?: string | null;
  location?: string | null;
  link?: string | null;
  attendees: string[];
  agenda?: string | null;
  notes?: string | null;
  status: "SCHEDULED" | "DONE" | "CANCELLED";
  actionItems?: ActionItem[];
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [openId, setOpenId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionDraft, setActionDraft] = useState<Record<string, { text: string; assignee: string; dueDate: string }>>({});
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const defaultStart = useMemo(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return toLocalInput(d);
  }, []);

  const [form, setForm] = useState({
    title: "",
    startAt: defaultStart,
    durationMins: "30",
    location: "",
    link: "",
    attendees: "",
    agenda: "",
  });

  async function load() {
    setLoading(true);
    try {
      const d = await api.meetings.list(tab);
      setMeetings((d.meetings ?? []) as Meeting[]);
    } catch (e) {
      console.error(e);
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const start = new Date(form.startAt);
    const end = new Date(start.getTime() + (Number(form.durationMins) || 30) * 60000);
    const body = {
      title: form.title.trim(),
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      location: form.location.trim() || null,
      link: form.link.trim() || null,
      attendees: form.attendees.split(",").map((a) => a.trim()).filter(Boolean),
      agenda: form.agenda.trim() || null,
    };
    setSaving(true);
    try {
      if (editing) await api.meetings.update(editing.id, body);
      else await api.meetings.create(body);
      setFormOpen(false);
      setEditing(null);
      setForm({ title: "", startAt: defaultStart, durationMins: "30", location: "", link: "", attendees: "", agenda: "" });
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save meeting");
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ title: "", startAt: defaultStart, durationMins: "30", location: "", link: "", attendees: "", agenda: "" });
    setFormOpen(true);
  }

  function openEdit(m: Meeting) {
    const start = new Date(m.startAt);
    const end = m.endAt ? new Date(m.endAt) : null;
    const mins = end ? Math.max(5, Math.round((end.getTime() - start.getTime()) / 60000)) : 30;
    setEditing(m);
    setForm({
      title: m.title,
      startAt: toLocalInput(start),
      durationMins: String(mins),
      location: m.location ?? "",
      link: m.link ?? "",
      attendees: m.attendees.join(", "),
      agenda: m.agenda ?? "",
    });
    setFormOpen(true);
  }

  async function patch(m: Meeting, body: any) {
    try {
      await api.meetings.update(m.id, body);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update meeting");
    }
  }

  async function remove(id: string) {
    if (!(await confirmDialog("Delete this meeting?"))) return;
    try {
      await api.meetings.remove(id);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete meeting");
    }
  }

  function setAction(m: Meeting, item: ActionItem) {
    setMeetings((list) =>
      list.map((x) =>
        x.id === m.id
          ? {
              ...x,
              actionItems: (x.actionItems ?? [])
                .map((a) => (a.id === item.id ? item : a))
                .sort((a, b) => Number(a.done) - Number(b.done)),
            }
          : x,
      ),
    );
  }

  async function addAction(m: Meeting) {
    const draft = actionDraft[m.id] ?? { text: "", assignee: "", dueDate: "" };
    const text = draft.text.trim();
    if (!text) return;
    setActionBusy(m.id);
    try {
      const d = await api.meetings.actionItems.create(m.id, {
        text,
        assignee: draft.assignee.trim() || null,
        dueDate: draft.dueDate ? new Date(`${draft.dueDate}T12:00:00`).toISOString() : null,
      });
      const item = d.actionItem as ActionItem;
      setMeetings((list) =>
        list.map((x) => (x.id === m.id ? { ...x, actionItems: [...(x.actionItems ?? []), item] } : x)),
      );
      setActionDraft((s) => ({ ...s, [m.id]: { text: "", assignee: "", dueDate: "" } }));
    } catch (err: any) {
      toast.error(err?.message || "Failed to add action item");
    } finally {
      setActionBusy(null);
    }
  }

  async function toggleAction(m: Meeting, item: ActionItem) {
    setAction(m, { ...item, done: !item.done });
    try {
      const d = await api.meetings.actionItems.update(m.id, item.id, { done: !item.done });
      setAction(m, d.actionItem as ActionItem);
    } catch (err: any) {
      setAction(m, item);
      toast.error(err?.message || "Failed to update action item");
    }
  }

  async function removeAction(m: Meeting, item: ActionItem) {
    const previous = m.actionItems ?? [];
    setMeetings((list) =>
      list.map((x) => (x.id === m.id ? { ...x, actionItems: previous.filter((a) => a.id !== item.id) } : x)),
    );
    try {
      await api.meetings.actionItems.remove(m.id, item.id);
    } catch (err: any) {
      setMeetings((list) => list.map((x) => (x.id === m.id ? { ...x, actionItems: previous } : x)));
      toast.error(err?.message || "Failed to delete action item");
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Meetings</h1>
          <p className="text-xs text-ink-3 mt-1">Agendas and notes so nothing gets lost after a call.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm inline-flex items-center gap-2">
          <Plus size={16} /> New meeting
        </button>
      </div>

      <div className="flex gap-1 rounded-xl border border-line p-1 bg-glass w-fit mb-5">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs rounded-lg ${tab === t ? "bg-accent text-white" : "text-ink-2 hover:bg-glass-hover"}`}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-6 text-sm text-ink-3">Loading…</div>
      ) : meetings.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <CalendarClock className="mx-auto text-ink-3" size={26} />
          <div className="text-sm text-ink-2 font-medium mt-2">No {tab} meetings</div>
          <div className="text-xs text-ink-3 mt-1">Schedule one to capture agenda and notes.</div>
        </div>
      ) : (
        <div className="grid gap-3">
          {meetings.map((m) => {
            const isOpen = openId === m.id;
            const done = m.status === "DONE";
            return (
              <div key={m.id} className="glass rounded-2xl border border-white/10 overflow-hidden">
                <div className="p-4 flex items-start gap-3">
                  <div className="size-11 rounded-xl bg-white/5 grid place-items-center text-accent shrink-0">
                    <CalendarClock size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className={`text-sm font-semibold truncate ${done ? "line-through opacity-70" : "text-ink"}`}>{m.title}</h2>
                      {done && <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />}
                      {(m.actionItems?.length ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-ink-3 border border-line rounded-full px-2 py-0.5 shrink-0">
                          <ListChecks size={10} />
                          {m.actionItems!.filter((a) => a.done).length}/{m.actionItems!.length}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-ink-3 mt-0.5 tabular">
                      {fmtDate(m.startAt)} · {fmtTime(m.startAt)}
                      {m.endAt ? ` – ${fmtTime(m.endAt)}` : ""}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-ink-3">
                      {m.location && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {m.location}</span>}
                      {m.link && (
                        <a href={m.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                          <Link2 size={11} /> Join
                        </a>
                      )}
                      {m.attendees.length > 0 && <span className="inline-flex items-center gap-1"><Users size={11} /> {m.attendees.length}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => patch(m, { status: done ? "SCHEDULED" : "DONE" })}
                      className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-emerald-400"
                      title={done ? "Mark scheduled" : "Mark done"}
                    >
                      <CheckCircle2 size={15} />
                    </button>
                    <button
                      onClick={() => setOpenId(isOpen ? null : m.id)}
                      className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink"
                      title="Agenda & notes"
                    >
                      <ChevronDown size={15} className={isOpen ? "rotate-180 transition-transform" : "transition-transform"} />
                    </button>
                    <button onClick={() => openEdit(m)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink" title="Edit meeting">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => remove(m.id)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-red-400" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-white/10 p-4 grid gap-3">
                    {m.attendees.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {m.attendees.map((a) => <span key={a} className="text-[10px] rounded-full bg-white/5 border border-line px-2 py-0.5 text-ink-2">{a}</span>)}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase tracking-wider text-ink-3 inline-flex items-center gap-1">
                          <ListChecks size={11} /> Action items
                        </label>
                        <span className="text-[10px] text-ink-3 tabular">
                          {(m.actionItems?.length ?? 0) === 0
                            ? "None yet"
                            : `${m.actionItems!.filter((a) => a.done).length}/${m.actionItems!.length} done`}
                        </span>
                      </div>

                      {(m.actionItems?.length ?? 0) > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {m.actionItems!.map((a) => (
                            <div key={a.id} className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
                              <button
                                onClick={() => toggleAction(m, a)}
                                className={`size-4 rounded border grid place-items-center shrink-0 transition-colors ${
                                  a.done ? "border-emerald-400 bg-emerald-400/20 text-emerald-300" : "border-line text-transparent hover:border-accent"
                                }`}
                                title={a.done ? "Mark not done" : "Mark done"}
                              >
                                <Check size={11} />
                              </button>
                              <span className={`text-xs flex-1 min-w-0 break-words ${a.done ? "line-through text-ink-3" : "text-ink-2"}`}>
                                {a.text}
                              </span>
                              {a.assignee && (
                                <span className="text-[9px] rounded-full bg-white/5 border border-line px-1.5 py-0.5 text-ink-3 shrink-0">
                                  {a.assignee}
                                </span>
                              )}
                              {a.dueDate && (
                                <span className="text-[9px] text-ink-3 tabular shrink-0">
                                  {new Date(a.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                </span>
                              )}
                              <button
                                onClick={() => removeAction(m, a)}
                                className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-red-400 shrink-0"
                                title="Delete action item"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <form
                        onSubmit={(e) => { e.preventDefault(); addAction(m); }}
                        className="mt-2 grid gap-1.5 sm:grid-cols-[1fr_110px_120px_auto]"
                      >
                        <input
                          value={actionDraft[m.id]?.text ?? ""}
                          onChange={(e) => setActionDraft((s) => ({ ...s, [m.id]: { text: e.target.value, assignee: s[m.id]?.assignee ?? "", dueDate: s[m.id]?.dueDate ?? "" } }))}
                          placeholder="Add an action item…"
                          maxLength={500}
                          className="rounded-lg border border-line bg-transparent px-2 py-1.5 text-xs text-ink"
                        />
                        <input
                          value={actionDraft[m.id]?.assignee ?? ""}
                          onChange={(e) => setActionDraft((s) => ({ ...s, [m.id]: { text: s[m.id]?.text ?? "", assignee: e.target.value, dueDate: s[m.id]?.dueDate ?? "" } }))}
                          placeholder="Owner"
                          maxLength={120}
                          className="rounded-lg border border-line bg-transparent px-2 py-1.5 text-xs text-ink"
                        />
                        <input
                          type="date"
                          value={actionDraft[m.id]?.dueDate ?? ""}
                          onChange={(e) => setActionDraft((s) => ({ ...s, [m.id]: { text: s[m.id]?.text ?? "", assignee: s[m.id]?.assignee ?? "", dueDate: e.target.value } }))}
                          className="rounded-lg border border-line bg-transparent px-2 py-1.5 text-xs text-ink"
                        />
                        <button
                          type="submit"
                          disabled={actionBusy === m.id || !(actionDraft[m.id]?.text ?? "").trim()}
                          className="text-[11px] px-2 py-1.5 rounded-lg border border-line text-ink-2 hover:bg-glass-hover disabled:opacity-50 inline-flex items-center justify-center gap-1"
                        >
                          <Plus size={11} /> {actionBusy === m.id ? "Adding…" : "Add"}
                        </button>
                      </form>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-ink-3">Agenda</label>
                      <textarea
                        defaultValue={m.agenda ?? ""}
                        onBlur={(e) => { if (e.target.value !== (m.agenda ?? "")) patch(m, { agenda: e.target.value }); }}
                        rows={3}
                        placeholder="What needs to be discussed?"
                        className="mt-1 w-full rounded-lg border border-line bg-transparent p-2.5 text-xs text-ink resize-y"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-ink-3">Notes</label>
                      <textarea
                        defaultValue={m.notes ?? ""}
                        onBlur={(e) => { if (e.target.value !== (m.notes ?? "")) patch(m, { notes: e.target.value }); }}
                        rows={4}
                        placeholder="Decisions, action items, follow-ups…"
                        className="mt-1 w-full rounded-lg border border-line bg-transparent p-2.5 text-xs text-ink resize-y"
                      />
                    </div>
                    <div className="text-[10px] text-ink-3">Saved automatically when you click away.</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[8vh] overflow-y-auto" onClick={() => { setFormOpen(false); setEditing(null); }}>
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b0f1a] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-ink">{editing ? "Edit meeting" : "New meeting"}</h2>
              <button onClick={() => { setFormOpen(false); setEditing(null); }} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={save} className="space-y-3">
              <input autoFocus value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Meeting title" className="input-glass text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-ink-3">Start</label>
                  <input type="datetime-local" value={form.startAt} onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))} className="input-glass text-sm mt-1" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-ink-3">Duration (min)</label>
                  <input type="number" min="5" step="5" value={form.durationMins} onChange={(e) => setForm((f) => ({ ...f, durationMins: e.target.value }))} className="input-glass text-sm mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Location (optional)" className="input-glass text-sm" />
                <input value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} placeholder="Meeting link (optional)" className="input-glass text-sm" />
              </div>
              <input value={form.attendees} onChange={(e) => setForm((f) => ({ ...f, attendees: e.target.value }))} placeholder="Attendees, comma separated" className="input-glass text-sm" />
              <textarea value={form.agenda} onChange={(e) => setForm((f) => ({ ...f, agenda: e.target.value }))} placeholder="Agenda (optional)" rows={3} className="input-glass text-sm resize-y" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setFormOpen(false); setEditing(null); }} className="btn-ghost text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-60">{saving ? "Saving…" : editing ? "Save changes" : "Schedule"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
