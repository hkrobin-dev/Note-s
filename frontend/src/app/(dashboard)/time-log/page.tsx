"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { confirmDialog } from "@/components/dialog/confirm";
import { GlassPanel, StatTile } from "@/components/glass/GlassPanel";
import { Plus, Edit, Trash2, Clock, Play, Pause, Activity } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/components/toast/toaster";
import { formatDistanceToNowStrict, format } from "date-fns";

const schema = z.object({
  taskId: z.string().optional().nullable(),
  routineId: z.string().optional().nullable(),
  startAt: z.string().min(1, "Pick a start time"),
  endAt: z.string().optional().nullable(),
  durationMins: z.union([z.coerce.number().int().positive(), z.literal("")]).optional().nullable(),
  note: z.string().optional().nullable(),
});

type FormValues = {
  taskId: string;
  routineId: string;
  startAt: string;
  endAt: string;
  durationMins: number | "";
  note: string;
};

type TimeEntry = {
  id: string;
  taskId?: string | null;
  routineId?: string | null;
  startAt: string;
  endAt?: string | null;
  durationMins?: number | null;
  note?: string | null;
  task?: { id: string; title: string } | null;
  routine?: { id: string; title: string } | null;
};

type Task = { id: string; title: string; status: string };
type Routine = { id: string; title: string };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoToLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  return toLocalInput(new Date(iso));
}

function localToIso(value: string) {
  return new Date(value).toISOString();
}

function fmtMinutes(m: number | null | undefined) {
  if (!m) return "0 min";
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return h > 0 ? `${h}h ${min}min` : `${min}min`;
}

function emptyForm(): FormValues {
  return {
    taskId: "",
    routineId: "",
    startAt: toLocalInput(new Date()),
    endAt: "",
    durationMins: "",
    note: "",
  };
}

export default function TimeLogPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState<{ id: string; startAt: Date; label: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>("");
  const [now, setNow] = useState(() => Date.now());
  const restoredRef = useRef(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: emptyForm(),
  });

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const d = await api.timeEntries.list(dateFilter ? { date: dateFilter } : undefined);
      const list = (d.timeEntries ?? []) as TimeEntry[];
      setEntries(list);

      // Restore an in-progress timer after a refresh (only for the unfiltered view).
      if (!restoredRef.current && !dateFilter) {
        restoredRef.current = true;
        const running = list.find((e) => !e.endAt);
        if (running) {
          setTimer({
            id: running.id,
            startAt: new Date(running.startAt),
            label: running.task?.title || running.routine?.title || "Focus session",
          });
        }
      }
    } catch (err: any) {
      if (!silent) toast({ title: "Could not load time entries", description: err?.message ?? "Check that the backend is running." });
      setEntries([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [dateFilter]);

  useEffect(() => {
    Promise.all([api.tasks.list().catch(() => ({ tasks: [] })), api.routines.list().catch(() => ({ routines: [] }))])
      .then(([t, r]) => {
        setTasks(((t.tasks ?? []) as Task[]).filter((x) => x.status !== "DONE" && x.status !== "CANCELLED"));
        setRoutines((r.routines ?? []) as Routine[]);
      })
      .catch(() => {
        /* optional pickers */
      });
  }, []);

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [timer]);

  const elapsedMins = timer ? Math.floor((now - timer.startAt.getTime()) / 60000) : 0;

  const totalShown = useMemo(
    () => entries.reduce((sum, e) => sum + (e.durationMins || 0), 0),
    [entries],
  );

  async function startTimer() {
    const startAt = new Date().toISOString();
    try {
      const d: any = await api.timeEntries.create({
        taskId: form.getValues("taskId") || undefined,
        routineId: form.getValues("routineId") || undefined,
        startAt,
        note: form.getValues("note") || undefined,
      });
      const entry = d.timeEntry as TimeEntry;
      const label =
        entry.task?.title ||
        entry.routine?.title ||
        tasks.find((t) => t.id === entry.taskId)?.title ||
        routines.find((r) => r.id === entry.routineId)?.title ||
        "Focus session";
      setTimer({ id: entry.id, startAt: new Date(startAt), label });
      setNow(Date.now());
      setOpen(false);
      form.reset(emptyForm());
      await load(true);
      toast({ title: "Timer started", description: `Tracking time for ${label}` });
    } catch (err: any) {
      toast({ title: "Could not start timer", description: err?.message ?? "Please try again." });
    }
  }

  async function stopTimer() {
    if (!timer) return;
    const endAt = new Date().toISOString();
    const durationMins = Math.max(0, Math.floor((new Date(endAt).getTime() - timer.startAt.getTime()) / 60000));
    try {
      await api.timeEntries.update(timer.id, { endAt, durationMins });
      const label = timer.label;
      setTimer(null);
      await load(true);
      toast({ title: "Timer stopped", description: `Logged ${fmtMinutes(durationMins)} for ${label}` });
    } catch (err: any) {
      toast({ title: "Could not stop timer", description: err?.message ?? "Please try again." });
    }
  }

  function openCreate() {
    setEditing(null);
    form.reset(emptyForm());
    setOpen(true);
  }

  function openEdit(e: TimeEntry) {
    setEditing(e.id);
    form.reset({
      taskId: e.taskId ?? "",
      routineId: e.routineId ?? "",
      startAt: isoToLocalInput(e.startAt),
      endAt: isoToLocalInput(e.endAt),
      durationMins: e.durationMins ?? "",
      note: e.note ?? "",
    });
    setOpen(true);
  }

  async function submit(d: FormValues) {
    setSaving(true);
    const startAt = localToIso(d.startAt);
    let endAt = d.endAt ? localToIso(d.endAt) : null;
    let durationMins = d.durationMins === "" ? null : Number(d.durationMins);

    // If both ends exist but no duration was entered, derive it.
    if (endAt && !durationMins) {
      const derived = Math.max(0, Math.floor((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000));
      durationMins = derived || null;
    }

    const body = {
      taskId: d.taskId || null,
      routineId: d.routineId || null,
      startAt,
      endAt,
      durationMins,
      note: d.note?.trim() || null,
    };
    try {
      if (editing) await api.timeEntries.update(editing, body);
      else await api.timeEntries.create(body);
      setOpen(false);
      setEditing(null);
      form.reset(emptyForm());
      await load(true);
      toast({ title: editing ? "Entry updated" : "Time entry logged" });
    } catch (err: any) {
      toast({ title: "Could not save entry", description: err?.message ?? "Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!(await confirmDialog("Delete this time entry?"))) return;
    try {
      await api.timeEntries.remove(id);
      setEntries((list) => list.filter((e) => e.id !== id));
      if (timer?.id === id) setTimer(null);
      toast({ title: "Entry deleted" });
    } catch (err: any) {
      toast({ title: "Could not delete entry", description: err?.message ?? "Please try again." });
    }
  }

  return (
    <div className="page-wrap py-8">
      <div className="flex flex-col items-center gap-4 mb-8 text-center">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Time Log</h1>
          <p className="text-xs text-ink-3">Track where your time goes — start/stop timers or log past sessions.</p>
        </div>
        <div className="flex items-center gap-2">
          {timer ? (
            <button onClick={stopTimer} className="btn-primary text-sm inline-flex items-center gap-2">
              <Pause size={16} /> Stop timer ({fmtMinutes(elapsedMins)})
            </button>
          ) : (
            <button onClick={openCreate} className="btn-primary text-sm inline-flex items-center gap-2">
              <Play size={16} /> Start timer
            </button>
          )}
          <button onClick={() => { const nowD = new Date(); form.reset({ ...emptyForm(), startAt: toLocalInput(nowD) }); setEditing(null); setOpen(true); }} className="btn-ghost text-sm inline-flex items-center gap-2">
            <Plus size={16} /> Log manually
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs text-ink-2 mb-1">Filter by date</label>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="input-glass" />
          </div>
          {dateFilter && (
            <button onClick={() => setDateFilter("")} className="text-xs text-accent hover:underline pb-2">
              Clear
            </button>
          )}
        </div>
        <StatTile
          label={dateFilter ? "Logged on date" : "Logged (shown)"}
          value={fmtMinutes(totalShown)}
          sub={`${entries.length} entr${entries.length === 1 ? "y" : "ies"}`}
          icon={Activity}
        />
      </div>

      <GlassPanel className="overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line/60">
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Task / Routine</th>
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Started</th>
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Duration</th>
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Note</th>
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-xs text-ink-3">Loading…</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-xs text-ink-3">No time entries yet. Start your first timer.</td></tr>
              ) : (
                entries.map((e) => {
                  const running = !e.endAt;
                  return (
                    <tr key={e.id} className="group hover:bg-glass-hover transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-ink truncate">
                            {e.task?.title || e.routine?.title || "Untitled"}
                          </div>
                          <div className="text-[10px] text-ink-3">{e.task ? "Task" : e.routine ? "Routine" : "General"}</div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-ink-3 tabular">{format(new Date(e.startAt), "MMM d, h:mm a")}</span>
                        <div className="text-[10px] text-ink-3">{formatDistanceToNowStrict(new Date(e.startAt), { addSuffix: true })}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium text-ink tabular">
                          {running ? (
                            <span className="text-emerald-300 inline-flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> running</span>
                          ) : (
                            fmtMinutes(e.durationMins)
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-4"><span className="text-[10px] text-ink-3 line-clamp-2">{e.note || "—"}</span></td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(e)} className="glass-interactive size-8 rounded-lg grid place-items-center text-ink-3 hover:text-ink" title="Edit"><Edit size={16} /></button>
                          <button onClick={() => remove(e.id)} className="glass-interactive size-8 rounded-lg grid place-items-center text-ink-3 hover:text-error" title="Delete"><Trash2 size={16} /></button>
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

      {open && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0f1a] p-5 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(ev) => ev.stopPropagation()}>
            <h3 className="text-sm font-semibold text-ink mb-4">{editing ? "Edit time entry" : "Log time"}</h3>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-3">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-ink-2 mb-1">Task</label>
                  <select {...form.register("taskId")} className="input-glass">
                    <option value="" className="bg-[#0b0f1a]">No task</option>
                    {tasks.map((t) => <option key={t.id} value={t.id} className="bg-[#0b0f1a]">{t.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-ink-2 mb-1">Routine</label>
                  <select {...form.register("routineId")} className="input-glass">
                    <option value="" className="bg-[#0b0f1a]">No routine</option>
                    {routines.map((r) => <option key={r.id} value={r.id} className="bg-[#0b0f1a]">{r.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-ink-2 mb-1">Start</label>
                  <input type="datetime-local" {...form.register("startAt")} className="input-glass" />
                  {form.formState.errors.startAt && <p className="text-[10px] text-error mt-1">{form.formState.errors.startAt.message}</p>}
                </div>
                <div>
                  <label className="block text-xs text-ink-2 mb-1">End (optional)</label>
                  <input type="datetime-local" {...form.register("endAt")} className="input-glass" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-ink-2 mb-1">Duration (mins, optional)</label>
                <input type="number" {...form.register("durationMins")} className="input-glass" min="1" placeholder="Auto from start/end" />
              </div>
              <div>
                <label className="block text-xs text-ink-2 mb-1">Note</label>
                <textarea {...form.register("note")} className="input-glass" rows={2} placeholder="What did you work on?" />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => { setOpen(false); setEditing(null); form.reset(emptyForm()); }} className="btn-ghost text-xs">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-xs disabled:opacity-60">
                  {saving ? "Saving…" : editing ? "Save entry" : "Log time"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {timer && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 glass-elevated rounded-2xl p-4 flex items-center gap-3 z-[60] border-b-0 border-r-0 min-w-[260px]">
          <Clock size={20} className="text-accent" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-ink">Timer running</div>
            <div className="text-sm font-medium text-ink truncate">{timer.label}</div>
            <div className="text-[10px] text-ink-3 tabular">{fmtMinutes(elapsedMins)} elapsed</div>
          </div>
          <button onClick={stopTimer} className="glass-interactive size-9 rounded-xl grid place-items-center text-error hover:bg-error/10" title="Stop timer">
            <Pause size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
