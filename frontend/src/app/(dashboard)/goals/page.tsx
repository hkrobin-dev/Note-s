"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/toast/toaster";
import { confirmDialog } from "@/components/dialog/confirm";
import { Plus, Target, Trash2, CheckCircle2, Minus, CalendarDays, Pencil, X, TrendingUp } from "lucide-react";

type Goal = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  targetValue: number;
  currentValue: number;
  unit?: string | null;
  dueDate?: string | null;
  status: "ACTIVE" | "COMPLETED" | "PAUSED" | "ARCHIVED";
};

const CATEGORIES = ["PERSONAL", "HEALTH", "CAREER", "FINANCE", "LEARNING", "OTHER"];

function progress(goal: Goal) {
  if (!goal.targetValue) return 0;
  return Math.max(0, Math.min(100, (goal.currentValue / goal.targetValue) * 100));
}

function formatDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ALL");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("PERSONAL");
  const [targetValue, setTargetValue] = useState("100");
  const [unit, setUnit] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [editing, setEditing] = useState<Goal | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category: "PERSONAL",
    targetValue: "100",
    currentValue: "0",
    unit: "",
    dueDate: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [logDraft, setLogDraft] = useState<Record<string, string>>({});
  const [busyGoal, setBusyGoal] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const d = await api.goals.list();
      setGoals((d.goals ?? []) as Goal[]);
    } catch (e) {
      console.error(e);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    if (filter === "ALL") return goals.filter((g) => g.status !== "ARCHIVED");
    return goals.filter((g) => g.status === filter);
  }, [goals, filter]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api.goals.create({
        title: title.trim(),
        category,
        targetValue: Number(targetValue) || 100,
        unit: unit.trim() || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });
      setTitle("");
      setTargetValue("100");
      setUnit("");
      setDueDate("");
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create goal");
    }
  }

  async function bump(goal: Goal, amount: number) {
    const next = Math.max(0, goal.currentValue + amount);
    const target = goal.targetValue || 100;
    setBusyGoal(goal.id);
    try {
      await api.goals.update(goal.id, {
        currentValue: next,
        status: next >= target ? "COMPLETED" : "ACTIVE",
      });
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update goal");
    } finally {
      setBusyGoal(null);
    }
  }

  async function logProgress(goal: Goal) {
    const raw = (logDraft[goal.id] ?? "").trim();
    const amount = Number(raw);
    if (!raw || Number.isNaN(amount)) return;
    const next = Math.max(0, goal.currentValue + amount);
    const target = goal.targetValue || 100;
    setBusyGoal(goal.id);
    try {
      await api.goals.update(goal.id, {
        currentValue: next,
        status: next >= target ? "COMPLETED" : "ACTIVE",
      });
      setLogDraft((d) => ({ ...d, [goal.id]: "" }));
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update goal");
    } finally {
      setBusyGoal(null);
    }
  }

  async function toggleComplete(goal: Goal) {
    try {
      await api.goals.update(goal.id, {
        status: goal.status === "COMPLETED" ? "ACTIVE" : "COMPLETED",
        ...(goal.status === "COMPLETED" ? {} : { currentValue: goal.targetValue }),
      });
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update goal");
    }
  }

  async function remove(id: string) {
    if (!(await confirmDialog("Delete this goal?"))) return;
    try {
      await api.goals.remove(id);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete goal");
    }
  }

  function openEdit(g: Goal) {
    setEditing(g);
    setEditForm({
      title: g.title,
      description: g.description ?? "",
      category: g.category,
      targetValue: String(g.targetValue),
      currentValue: String(g.currentValue),
      unit: g.unit ?? "",
      dueDate: g.dueDate ? new Date(g.dueDate).toISOString().slice(0, 10) : "",
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !editForm.title.trim()) return;
    setSavingEdit(true);
    try {
      const target = Number(editForm.targetValue) || 0;
      const current = Number(editForm.currentValue) || 0;
      await api.goals.update(editing.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        category: editForm.category,
        targetValue: target,
        currentValue: current,
        unit: editForm.unit.trim() || null,
        dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : null,
        status: current >= target && target > 0 ? "COMPLETED" : "ACTIVE",
      });
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update goal");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Goals</h1>
          <p className="text-xs text-ink-3 mt-1">Track progress toward what matters.</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-line p-1 bg-glass w-fit">
          {(["ALL", "ACTIVE", "COMPLETED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg transition ${filter === f ? "bg-accent text-white" : "text-ink-2 hover:bg-glass-hover"}`}
            >
              {f[0] + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={create} className="glass rounded-2xl p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="flex-1 px-3 py-2 rounded-lg border border-line bg-transparent text-sm text-ink"
            placeholder="New goal (e.g. Read 12 books)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button type="submit" className="btn-primary text-sm inline-flex items-center gap-2 px-4">
            <Plus size={16} /> Add goal
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-line bg-transparent text-xs text-ink"
          >
            {CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#0b0f1a]">{c[0] + c.slice(1).toLowerCase()}</option>)}
          </select>
          <input
            type="number"
            min="0"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            className="px-3 py-2 rounded-lg border border-line bg-transparent text-xs text-ink"
            placeholder="Target"
          />
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="px-3 py-2 rounded-lg border border-line bg-transparent text-xs text-ink"
            placeholder="Unit (books, kg…)"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-line bg-transparent text-xs text-ink"
          />
        </div>
      </form>

      {loading ? (
        <div className="glass rounded-2xl p-6 text-sm text-ink-3">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Target className="mx-auto text-ink-3" size={28} />
          <div className="text-sm text-ink-2 font-medium mt-2">No goals yet</div>
          <div className="text-xs text-ink-3 mt-1">Add your first goal above to start tracking.</div>
        </div>
      ) : (
        <div className="grid gap-3">
          {visible.map((g) => {
            const pct = progress(g);
            const done = g.status === "COMPLETED";
            return (
              <div key={g.id} className="glass rounded-2xl border border-white/10 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleComplete(g)} className="shrink-0" aria-label="Toggle complete">
                        {done ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Target size={18} className="text-accent" />}
                      </button>
                      <h2 className={`text-sm font-semibold truncate ${done ? "line-through opacity-70" : "text-ink"}`}>{g.title}</h2>
                      <span className="text-[10px] uppercase tracking-wider text-ink-3 border border-line rounded-full px-2 py-0.5">{g.category}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-ink-3">
                      <span className="tabular">{g.currentValue} / {g.targetValue}{g.unit ? ` ${g.unit}` : ""}</span>
                      {g.dueDate && (
                        <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> {formatDate(g.dueDate)}</span>
                      )}
                      <span className="tabular font-semibold text-ink-2">{Math.round(pct)}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => bump(g, -1)}
                      className="size-7 grid place-items-center rounded-lg border border-line text-ink-3 hover:text-ink"
                      aria-label="Decrease"
                    >
                      <Minus size={13} />
                    </button>
                    <button
                      onClick={() => bump(g, 1)}
                      className="size-7 grid place-items-center rounded-lg border border-line text-ink-3 hover:text-ink"
                      aria-label="Increase"
                    >
                      <Plus size={13} />
                    </button>
                    <button
                      onClick={() => openEdit(g)}
                      className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink"
                      aria-label="Edit goal"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => remove(g.id)}
                      className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-red-400"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${done ? "bg-emerald-400" : "bg-accent"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {!done && (
                  <form
                    onSubmit={(e) => { e.preventDefault(); logProgress(g); }}
                    className="mt-3 flex items-center gap-2"
                  >
                    <TrendingUp size={13} className="text-ink-3 shrink-0" />
                    <input
                      type="number"
                      step="any"
                      value={logDraft[g.id] ?? ""}
                      onChange={(e) => setLogDraft((d) => ({ ...d, [g.id]: e.target.value }))}
                      placeholder={`Log progress${g.unit ? ` (${g.unit})` : ""}`}
                      className="w-40 rounded-lg border border-line bg-transparent px-2 py-1 text-xs text-ink"
                    />
                    <button
                      type="submit"
                      disabled={busyGoal === g.id || !(logDraft[g.id] ?? "").trim()}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-line text-ink-2 hover:bg-glass-hover disabled:opacity-50"
                    >
                      {busyGoal === g.id ? "Saving…" : "Add"}
                    </button>
                    <span className="text-[10px] text-ink-3">
                      Negative values subtract.
                    </span>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0f1a] p-5 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-ink">Edit goal</h2>
              <button onClick={() => setEditing(null)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={saveEdit} className="space-y-3">
              <div>
                <label className="block text-xs text-ink-2 mb-1">Title</label>
                <input autoFocus value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} className="input-glass" placeholder="Goal title" />
              </div>
              <div>
                <label className="block text-xs text-ink-2 mb-1">Description (optional)</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="input-glass resize-y" placeholder="Why does this matter?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-ink-2 mb-1">Category</label>
                  <select value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} className="input-glass">
                    {CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#0b0f1a]">{c[0] + c.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-ink-2 mb-1">Unit</label>
                  <input value={editForm.unit} onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))} className="input-glass" placeholder="books, kg…" />
                </div>
                <div>
                  <label className="block text-xs text-ink-2 mb-1">Current</label>
                  <input type="number" min="0" value={editForm.currentValue} onChange={(e) => setEditForm((f) => ({ ...f, currentValue: e.target.value }))} className="input-glass" />
                </div>
                <div>
                  <label className="block text-xs text-ink-2 mb-1">Target</label>
                  <input type="number" min="0" value={editForm.targetValue} onChange={(e) => setEditForm((f) => ({ ...f, targetValue: e.target.value }))} className="input-glass" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-ink-2 mb-1">Due date (optional)</label>
                <input type="date" value={editForm.dueDate} onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))} className="input-glass" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="btn-ghost text-xs">Cancel</button>
                <button type="submit" disabled={savingEdit} className="btn-primary text-xs disabled:opacity-60">{savingEdit ? "Saving…" : "Save changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
