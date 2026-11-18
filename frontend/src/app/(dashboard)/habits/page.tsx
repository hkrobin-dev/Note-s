"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { confirmDialog } from "@/components/dialog/confirm";
import { useToast } from "@/components/toast/toaster";
import { cn } from "@/lib/utils";
import { Plus, CheckCircle2, Circle, Trash2, Flame, Activity } from "lucide-react";

type HabitLog = { id: string; date: string };
type Habit = { id: string; title: string; checkedInToday: boolean; logs: HabitLog[] };

function dayKey(d: Date) {
  return d.toDateString();
}

function streakOf(habit: Habit) {
  const days = new Set(habit.logs.map((l) => dayKey(new Date(l.date))));
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function lastSeven(habit: Habit) {
  const days = new Set(habit.logs.map((l) => dayKey(new Date(l.date))));
  const out: { key: string; label: string; done: boolean; isToday: boolean }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    out.push({
      key: dayKey(d),
      label: d.toLocaleDateString(undefined, { weekday: "narrow" }),
      done: days.has(dayKey(d)),
      isToday: i === 0,
    });
  }
  return out;
}

export default function HabitsPage() {
  const { toast } = useToast();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const d = await api.habits.list();
      setHabits((d.habits ?? []) as Habit[]);
    } catch (err: any) {
      toast({ title: "Could not load habits", description: err?.message ?? "Check that the backend is running." });
      setHabits([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const checkedToday = useMemo(() => habits.filter((h) => h.checkedInToday).length, [habits]);
  const bestStreak = useMemo(
    () => habits.reduce((best, h) => Math.max(best, streakOf(h)), 0),
    [habits],
  );

  async function addHabit(e: React.FormEvent) {
    e.preventDefault();
    const name = title.trim();
    if (!name) return;
    setAdding(true);
    try {
      await api.habits.create({ title: name });
      setTitle("");
      await load();
    } catch (err: any) {
      toast({ title: "Could not add habit", description: err?.message ?? "Please try again." });
    } finally {
      setAdding(false);
    }
  }

  async function toggle(h: Habit) {
    setBusy(h.id);
    setHabits((list) =>
      list.map((x) =>
        x.id === h.id
          ? {
              ...x,
              checkedInToday: !h.checkedInToday,
              logs: h.checkedInToday
                ? x.logs.filter((l) => dayKey(new Date(l.date)) !== dayKey(new Date()))
                : [...x.logs, { id: "optimistic", date: new Date().toISOString() }],
            }
          : x,
      ),
    );
    try {
      if (h.checkedInToday) await api.habits.uncheckin(h.id);
      else await api.habits.checkin(h.id);
      await load();
    } catch (err: any) {
      setHabits((list) => list.map((x) => (x.id === h.id ? h : x)));
      toast({ title: "Could not update habit", description: err?.message ?? "Please try again." });
    } finally {
      setBusy(null);
    }
  }

  async function remove(h: Habit) {
    if (!(await confirmDialog(`Delete "${h.title}"? Its check-in history will be removed too.`))) return;
    try {
      await api.habits.remove(h.id);
      setHabits((list) => list.filter((x) => x.id !== h.id));
    } catch (err: any) {
      toast({ title: "Could not delete habit", description: err?.message ?? "Please try again." });
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Habits</h1>
        <p className="text-xs text-ink-3 mt-1">
          {habits.length === 0
            ? "Check in daily to build streaks."
            : `${checkedToday}/${habits.length} checked in today · best streak ${bestStreak} day${bestStreak === 1 ? "" : "s"}.`}
        </p>
      </div>

      <form onSubmit={addHabit} className="glass rounded-2xl p-3 mb-6 flex items-center gap-2">
        <Plus size={16} className="text-ink-3 ml-1 shrink-0" />
        <input
          className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
          placeholder="New habit (e.g. Drink water) and press Enter…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" disabled={adding || !title.trim()} className="text-xs px-3 py-1.5 rounded-lg border border-line text-ink-2 hover:bg-glass-hover disabled:opacity-50">
          {adding ? "Adding…" : "Add"}
        </button>
      </form>

      {loading ? (
        <div className="glass rounded-2xl p-6 text-sm text-ink-3">Loading habits…</div>
      ) : habits.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Activity className="mx-auto text-ink-3" size={26} />
          <div className="text-sm text-ink-2 font-medium mt-2">No habits yet</div>
          <div className="text-xs text-ink-3 mt-1">Add your first habit above.</div>
        </div>
      ) : (
        <div className="grid gap-3">
          {habits.map((h) => {
            const streak = streakOf(h);
            const week = lastSeven(h);
            return (
              <div key={h.id} className="glass rounded-2xl border border-white/10 p-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggle(h)}
                    disabled={busy === h.id}
                    className="mt-0.5 shrink-0 disabled:opacity-60"
                    title={h.checkedInToday ? "Undo today's check-in" : "Check in for today"}
                  >
                    {h.checkedInToday ? (
                      <CheckCircle2 size={20} className="text-emerald-400" />
                    ) : (
                      <Circle size={20} className="text-ink-3 hover:text-accent" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-sm font-medium", h.checkedInToday ? "text-ink" : "text-ink")}>
                        {h.title}
                      </span>
                      {streak > 0 && (
                        <span className="text-[10px] font-semibold rounded-full border border-amber-400/40 text-amber-300 bg-amber-400/10 px-2 py-0.5 inline-flex items-center gap-1">
                          <Flame size={10} /> {streak} day{streak === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      {week.map((d) => (
                        <div key={d.key} className="flex flex-col items-center gap-1" title={d.key}>
                          <div
                            className={cn(
                              "size-6 rounded-md border",
                              d.done
                                ? "bg-emerald-400/70 border-emerald-400/70"
                                : "bg-white/5 border-white/10",
                              d.isToday && "ring-1 ring-accent/60",
                            )}
                          />
                          <span className={cn("text-[9px] uppercase", d.isToday ? "text-accent" : "text-ink-3")}>
                            {d.label}
                          </span>
                        </div>
                      ))}
                      <span className="ml-2 text-[10px] text-ink-3 tabular">
                        {h.logs.length} check-in{h.logs.length === 1 ? "" : "s"} in 30 days
                      </span>
                    </div>
                  </div>
                  <button onClick={() => remove(h)} className="shrink-0 text-ink-3 hover:text-red-400" aria-label="Delete habit">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
