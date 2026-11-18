"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { confirmDialog } from "@/components/dialog/confirm";
import { format } from "date-fns";
import { useToast } from "@/components/toast/toaster";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Wallet, Pencil, X } from "lucide-react";

type Budget = {
  id: string;
  amount: number | string;
  month: string;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
};
type Category = { id: string; name: string };
type Expense = { id: string; amount: number | string; expenseDate: string; categoryId: string };

function monthKeyOf(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function BudgetsPage() {
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [categoryId, setCategoryId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [b, e, c] = await Promise.all([
        api.budgets.list(),
        api.expenses.list(),
        api.expenses.categories(),
      ]);
      setBudgets((b.budgets ?? []) as Budget[]);
      setExpenses((e.expenses ?? []) as Expense[]);
      setCategories((c.categories ?? []) as Category[]);
    } catch (err: any) {
      toast({ title: "Could not load budgets", description: err?.message ?? "Check that the backend is running." });
      setBudgets([]);
      setExpenses([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const spentByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      const key = monthKeyOf(e.expenseDate);
      map.set(key, (map.get(key) ?? 0) + Number(e.amount));
    }
    return map;
  }, [expenses]);

  const spentByMonthCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      const key = `${monthKeyOf(e.expenseDate)}:${e.categoryId}`;
      map.set(key, (map.get(key) ?? 0) + Number(e.amount));
    }
    return map;
  }, [expenses]);

  function resetForm() {
    setAmount("");
    setCategoryId("");
    setEditingId(null);
  }

  async function saveBudget(e: React.FormEvent) {
    e.preventDefault();
    const clean = amount.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(clean) || !month) {
      toast({ title: "Enter a valid amount", description: "Use numbers like 20000 or 12500.50." });
      return;
    }
    setSaving(true);
    try {
      // Month is the first day of the month, sent as ISO.
      const m = new Date(`${month}-01T00:00:00.000Z`);
      await api.budgets.upsert({
        amount: clean,
        month: m.toISOString(),
        categoryId: categoryId || null,
      });
      resetForm();
      await load();
      toast({ title: editingId ? "Budget updated" : "Budget saved" });
    } catch (err: any) {
      toast({ title: "Could not save budget", description: err?.message ?? "Please try again." });
    } finally {
      setSaving(false);
    }
  }

  function startEdit(b: Budget) {
    setEditingId(b.id);
    setAmount(String(b.amount));
    setMonth(b.month.slice(0, 7));
    setCategoryId(b.categoryId ?? "");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(b: Budget) {
    const label = b.category?.name ? `${b.category.name} · ${format(new Date(b.month), "MMMM yyyy")}` : format(new Date(b.month), "MMMM yyyy");
    if (!(await confirmDialog(`Delete the budget for ${label}?`))) return;
    try {
      await api.budgets.remove(b.id);
      setBudgets((list) => list.filter((x) => x.id !== b.id));
      if (editingId === b.id) resetForm();
      toast({ title: "Budget deleted" });
    } catch (err: any) {
      toast({ title: "Could not delete budget", description: err?.message ?? "Please try again." });
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Budget[]>();
    for (const b of budgets) {
      const key = monthKeyOf(b.month);
      const arr = map.get(key) ?? [];
      arr.push(b);
      map.set(key, arr);
    }
    // Whole-month budget first inside each month, then category budgets alphabetically.
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        if (!a.categoryId && b.categoryId) return -1;
        if (a.categoryId && !b.categoryId) return 1;
        return (a.category?.name ?? "").localeCompare(b.category?.name ?? "");
      });
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [budgets]);

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Budgets</h1>
        <p className="text-xs text-ink-3 mt-1">
          Set monthly spending limits — for the whole month or per category — and track them against real expenses.
        </p>
      </div>

      <form onSubmit={saveBudget} className="glass rounded-2xl p-5 mb-6 grid gap-3 sm:grid-cols-4">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-ink-3 mb-1">Month</label>
          <input type="month" className="w-full px-3 py-2 rounded-lg border border-line bg-transparent text-sm text-ink" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-ink-3 mb-1">Scope</label>
          <select
            className="w-full px-3 py-2 rounded-lg border border-line bg-transparent text-sm text-ink"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="" className="bg-[#0b0f1a]">Whole month</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#0b0f1a]">{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-ink-3 mb-1">Limit (৳)</label>
          <input
            className="w-full px-3 py-2 rounded-lg border border-line bg-transparent text-sm text-ink"
            placeholder="e.g. 20000"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" disabled={saving} className="btn-primary text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60 flex-1">
            <Plus size={16} /> {saving ? "Saving…" : editingId ? "Update" : "Set budget"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-ghost text-sm h-[38px]" title="Cancel edit">
              <X size={15} />
            </button>
          )}
        </div>
        {editingId && (
          <div className="sm:col-span-4 text-[11px] text-accent">
            Editing an existing budget — saving will merge it into the same month &amp; scope.
          </div>
        )}
      </form>

      <div className="glass rounded-2xl overflow-hidden border border-white/10">
        <div className="px-5 py-4 border-b border-white/10 text-sm font-semibold text-ink-2 uppercase tracking-wider">Monthly budgets</div>
        {loading ? (
          <div className="p-6 text-sm text-ink-3">Loading…</div>
        ) : grouped.length === 0 ? (
          <div className="p-10 text-center">
            <Wallet className="mx-auto text-ink-3" size={26} />
            <div className="text-sm text-ink-2 font-medium mt-2">No budgets yet</div>
            <div className="text-xs text-ink-3 mt-1">Set one above to compare it against your expenses.</div>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {grouped.map(([key, list]) => {
              const monthSpent = spentByMonth.get(key) ?? 0;
              const whole = list.find((b) => !b.categoryId);
              return (
                <div key={key} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div className="text-sm font-semibold text-ink">{format(new Date(list[0].month), "MMMM yyyy")}</div>
                    <div className="text-[11px] text-ink-3 tabular">
                      Spent this month: <span className="text-ink-2 font-medium">৳{monthSpent.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {list.map((b) => {
                      const limit = Number(b.amount);
                      const spent = b.categoryId
                        ? spentByMonthCategory.get(`${key}:${b.categoryId}`) ?? 0
                        : monthSpent;
                      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
                      const over = spent > limit;
                      const label = b.category?.name ?? "Whole month";
                      return (
                        <div key={b.id} className={cn("rounded-xl border border-white/10 px-4 py-3", editingId === b.id && "ring-1 ring-accent/50")}>
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <span className={cn("status-pill", !b.categoryId && "text-accent border-accent/40")}>{label}</span>
                              {whole && b.categoryId && (
                                <div className="text-[10px] text-ink-3 mt-1 tabular">
                                  {Math.round((spent / Math.max(1, monthSpent)) * 100)}% of the month's spending
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className={cn("text-sm font-semibold tabular", over ? "text-red-300" : "text-ink")}>
                                  ৳{spent.toLocaleString()} <span className="text-ink-3 font-normal">/ ৳{limit.toLocaleString()}</span>
                                </div>
                                <div className="text-[10px] text-ink-3 tabular">
                                  {over ? `৳${(spent - limit).toLocaleString()} over budget` : `৳${(limit - spent).toLocaleString()} left · ${pct}%`}
                                </div>
                              </div>
                              <button onClick={() => startEdit(b)} className="text-ink-3 hover:text-ink" aria-label="Edit budget">
                                <Pencil size={15} />
                              </button>
                              <button onClick={() => remove(b)} className="text-ink-3 hover:text-red-400" aria-label="Delete budget">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", over ? "bg-red-400" : pct >= 80 ? "bg-amber-400" : "bg-accent")}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
