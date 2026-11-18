"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { Plus, Edit, Trash2, Clock, CheckCircle, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast/toaster";

const schema = z.object({
  title: z.string().min(1, "Give the routine a title").max(200),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm"),
  daysOfWeek: z.array(z.string()).default([]),
  taskId: z.string().optional().nullable(),
  reminderOffsetMins: z.coerce.number().int().min(0).max(1440).default(0),
  active: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;
type Weekday = { id: string; label: string; dow: number };
type Task = { id: string; title: string; status: string };

const WEEKDAYS: Weekday[] = [
  { id: "1", label: "Mon", dow: 1 },
  { id: "2", label: "Tue", dow: 2 },
  { id: "3", label: "Wed", dow: 3 },
  { id: "4", label: "Thu", dow: 4 },
  { id: "5", label: "Fri", dow: 5 },
  { id: "6", label: "Sat", dow: 6 },
  { id: "7", label: "Sun", dow: 7 },
];

const EMPTY_FORM: FormValues = {
  title: "",
  timeOfDay: "09:00",
  daysOfWeek: [],
  taskId: "",
  reminderOffsetMins: 10,
  active: true,
};

function formatTime(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  return new Date(0, 0, 0, hh, mm).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function RoutinesPage() {
  const { toast } = useToast();
  const [routines, setRoutines] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: EMPTY_FORM,
  });

  const selectedDays = form.watch("daysOfWeek") ?? [];
  const selectedSet = new Set(selectedDays.map(Number));

  async function load() {
    setLoading(true);
    try {
      const [r, t] = await Promise.all([api.routines.list(), api.tasks.list().catch(() => ({ tasks: [] }))]);
      setRoutines(((r.routines ?? []) as any[]).sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay)));
      setTasks(((t.tasks ?? []) as Task[]).filter((task) => task.status !== "DONE" && task.status !== "CANCELLED"));
    } catch {
      setRoutines([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  function openCreate() {
    setEditing(null);
    form.reset(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(r: any) {
    setEditing(r.id);
    form.reset({
      title: r.title,
      timeOfDay: r.timeOfDay,
      daysOfWeek: (r.daysOfWeek ?? []).map(String),
      taskId: r.taskId ?? "",
      reminderOffsetMins: r.reminderOffsetMins ?? 0,
      active: !!r.active,
    });
    setOpen(true);
  }

  function toggleDay(dow: number) {
    const next = new Set(selectedSet);
    if (next.has(dow)) next.delete(dow);
    else next.add(dow);
    form.setValue("daysOfWeek", Array.from(next).map(String), { shouldDirty: true });
  }

  async function submit(d: FormValues) {
    setSaving(true);
    const body = {
      title: d.title.trim(),
      timeOfDay: d.timeOfDay,
      daysOfWeek: d.daysOfWeek.map(Number),
      taskId: d.taskId || null,
      reminderOffsetMins: Number(d.reminderOffsetMins) || 0,
      active: d.active,
    };
    try {
      if (editing) await api.routines.update(editing, body);
      else await api.routines.create(body);
      setOpen(false);
      setEditing(null);
      form.reset(EMPTY_FORM);
      await load();
      toast({ title: editing ? "Routine updated" : "Routine created" });
    } catch (err: any) {
      toast({ title: "Could not save routine", description: err?.message ?? "Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function toggle(id: string, active: boolean) {
    try {
      await api.routines.update(id, { active });
      setRoutines((list) => list.map((r) => (r.id === id ? { ...r, active } : r)));
    } catch (err: any) {
      toast({ title: "Could not update routine", description: err?.message ?? "Please try again." });
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this routine?")) return;
    try {
      await api.routines.remove(id);
      setRoutines((list) => list.filter((r) => r.id !== id));
    } catch (err: any) {
      toast({ title: "Could not remove routine", description: err?.message ?? "Please try again." });
    }
  }

  return (
    <div className="page-wrap py-8">
      <div className="flex flex-col items-center gap-4 mb-8 text-center">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Daily Routines</h1>
          <p className="text-xs text-ink-3">Set repeating routines with reminders so good habits run on autopilot.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm inline-flex items-center gap-2">
          <Plus size={16} /> New routine
        </button>
      </div>

      <GlassPanel className="overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line/60">
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Routine</th>
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Time</th>
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Days</th>
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Reminder</th>
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Status</th>
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-xs text-ink-3">Loading…</td></tr>
              ) : routines.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-xs text-ink-3">No routines yet. Create your first routine.</td></tr>
              ) : (
                routines.map((r) => {
                  const days: number[] = r.daysOfWeek ?? [];
                  return (
                    <tr key={r.id} className="group hover:bg-glass-hover transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Clock size={14} className="text-accent" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-ink">{r.title}</div>
                            {r.task && <div className="text-[10px] text-ink-3 mt-0.5">Linked task: {r.task.title}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className="text-sm text-ink-3 tabular">{formatTime(r.timeOfDay)}</span></td>
                      <td className="px-5 py-4">
                        {days.length === 0 ? (
                          <span className="text-[10px] text-ink-3">Every day</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {WEEKDAYS.map((w) => (
                              <span
                                key={w.id}
                                className={cn(
                                  "text-[10px] rounded px-2 py-0.5 border font-medium",
                                  days.includes(w.dow)
                                    ? "bg-accent text-white border-accent"
                                    : "bg-glass text-ink-3 border-line/60",
                                )}
                              >
                                {w.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border border-line text-ink-3 bg-glass">
                          −{r.reminderOffsetMins ?? 0} min
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => toggle(r.id, !r.active)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border transition-colors",
                            r.active ? "border-positive text-positive bg-positive/10" : "border-error text-error bg-error/10",
                          )}
                        >
                          {r.active ? <CheckCircle size={10} /> : <X size={10} />}
                          {r.active ? "Active" : "Paused"}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(r)} className="glass-interactive size-8 rounded-lg grid place-items-center text-ink-3 hover:text-ink" title="Edit"><Edit size={16} /></button>
                          <button onClick={() => remove(r.id)} className="glass-interactive size-8 rounded-lg grid place-items-center text-ink-3 hover:text-error" title="Delete"><Trash2 size={16} /></button>
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
        <div className="fixed inset-0 z-[50] flex items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto glass-modal w-full max-w-md rounded-3xl p-6 border-b-0 border-r-0 overflow-hidden max-h-[85vh] flex flex-col">
            <h3 className="text-sm font-semibold text-ink mb-4">{editing ? "Edit routine" : "New routine"}</h3>
            <form onSubmit={form.handleSubmit(submit)} className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs text-ink-2 mb-1">Routine title</label>
                <input {...form.register("title")} className="input-glass" placeholder="e.g. Morning exercise" autoFocus />
                {form.formState.errors.title && <p className="text-[10px] text-error mt-1">{form.formState.errors.title.message}</p>}
              </div>
              <div className="grid gap-3 grid-cols-2">
                <div>
                  <label className="block text-xs text-ink-2 mb-1">Time</label>
                  <input type="time" {...form.register("timeOfDay")} className="input-glass" />
                  {form.formState.errors.timeOfDay && <p className="text-[10px] text-error mt-1">{form.formState.errors.timeOfDay.message}</p>}
                </div>
                <div>
                  <label className="block text-xs text-ink-2 mb-1">Remind before (mins)</label>
                  <input type="number" {...form.register("reminderOffsetMins")} className="input-glass" min="0" max="1440" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-ink-2">Repeat on</label>
                  <span className="text-[10px] text-ink-3">{selectedDays.length === 0 ? "Every day" : `${selectedDays.length} day${selectedDays.length === 1 ? "" : "s"}`}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => toggleDay(w.dow)}
                      className={cn(
                        "text-[11px] rounded-lg px-2.5 py-1 border font-medium transition-colors",
                        selectedSet.has(w.dow)
                          ? "bg-accent text-white border-accent"
                          : "bg-glass text-ink-3 border-line/60 hover:text-ink",
                      )}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-ink-2 mb-1">Linked task (optional)</label>
                <select {...form.register("taskId")} className="input-glass">
                  <option value="" className="bg-[#0b0f1a]">No linked task</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#0b0f1a]">{t.title}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-ink">
                <input type="checkbox" {...form.register("active")} className="rounded" />
                Active
              </label>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => { setOpen(false); setEditing(null); form.reset(EMPTY_FORM); }} className="btn-ghost text-xs">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-xs disabled:opacity-60">
                  {saving ? "Saving…" : editing ? "Save routine" : "Create routine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
