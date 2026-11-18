"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { GlassPanel, StatTile } from "@/components/glass/GlassPanel";
import { Plus, CreditCard, Edit, Trash2, X, Check, Repeat, Play, Pause } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/components/toast/toaster";

const PAYMENT_METHODS = ["CASH", "CARD", "BANK_TRANSFER", "MOBILE_WALLET", "OTHER"] as const;

const schema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 250 or 12.50"),
  expenseDate: z.string().min(1, "Pick a date"),
  description: z.string().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).default("CASH"),
  vendor: z.string().optional(),
  categoryId: z.string().min(1, "Pick a category"),
});

type Expense = {
  id: string;
  amount: number | string;
  expenseDate: string;
  description?: string | null;
  paymentMethod: string;
  vendor?: string | null;
  categoryId: string;
  category?: { id: string; name: string } | null;
};

type Category = { id: string; name: string };

type Recurring = {
  id: string;
  name: string;
  amount: number | string;
  frequency: string;
  categoryId: string;
  category?: { id: string; name: string } | null;
  startDate: string;
  endDate?: string | null;
  nextExpectedAt: string;
  active: boolean;
  autoCreate: boolean;
};

const FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;
const FREQUENCY_LABEL: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
  CUSTOM: "Custom",
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyForm() {
  return {
    amount: "",
    expenseDate: toLocalInput(new Date().toISOString()),
    description: "",
    paymentMethod: "CASH" as (typeof PAYMENT_METHODS)[number],
    vendor: "",
    categoryId: "",
  };
}

export default function ExpensesPage() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [monthSpent, setMonthSpent] = useState<number | null>(null);
  const [showCat, setShowCat] = useState(false);
  const [catName, setCatName] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [recOpen, setRecOpen] = useState(false);
  const [recEditing, setRecEditing] = useState<Recurring | null>(null);
  const [recSaving, setRecSaving] = useState(false);
  const [recForm, setRecForm] = useState({
    name: "",
    amount: "",
    frequency: "MONTHLY" as (typeof FREQUENCIES)[number],
    categoryId: "",
    startDate: toLocalInput(new Date().toISOString()),
    autoCreate: false,
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema) as any,
    defaultValues: emptyForm(),
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [e, c, r, rec] = await Promise.all([
        api.expenses.list(),
        api.expenses.categories(),
        api.reports.dashboard().catch(() => null),
        api.expenses.recurring.list().catch(() => ({ recurring: [] })),
      ]);
      setExpenses(
        ((e.expenses ?? []) as Expense[]).sort(
          (a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime(),
        ),
      );
      setCategories((c.categories ?? []) as Category[]);
      setMonthSpent(r?.spentThisMonth ?? null);
      setRecurring((rec.recurring ?? []) as Recurring[]);
    } catch (err: any) {
      toast({ title: "Could not load expenses", description: err?.message ?? "Check that the backend is running." });
      setExpenses([]);
      setCategories([]);
      setMonthSpent(null);
      setRecurring([]);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setShowCat(false);
    setCatName("");
    form.reset({ ...emptyForm(), categoryId: categories[0]?.id ?? "" });
    setOpen(true);
  }

  function openEdit(e: Expense) {
    setEditing(e);
    setShowCat(false);
    form.reset({
      amount: String(e.amount),
      expenseDate: toLocalInput(e.expenseDate),
      description: e.description ?? "",
      paymentMethod: (PAYMENT_METHODS as readonly string[]).includes(e.paymentMethod)
        ? (e.paymentMethod as (typeof PAYMENT_METHODS)[number])
        : "CASH",
      vendor: e.vendor ?? "",
      categoryId: e.categoryId || e.category?.id || categories[0]?.id || "",
    });
    setOpen(true);
  }

  async function save(d: z.infer<typeof schema>) {
    setSaving(true);
    try {
      const body = {
        amount: d.amount,
        expenseDate: new Date(d.expenseDate).toISOString(),
        description: d.description?.trim() || null,
        paymentMethod: d.paymentMethod,
        vendor: d.vendor?.trim() || null,
        categoryId: d.categoryId,
      };
      if (editing) await api.expenses.update(editing.id, body);
      else await api.expenses.create(body);
      setOpen(false);
      setEditing(null);
      form.reset(emptyForm());
      await load();
      toast({ title: editing ? "Expense updated" : "Expense added" });
    } catch (err: any) {
      toast({ title: "Could not save expense", description: err?.message ?? "Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function remove(e: Expense) {
    if (!confirm("Delete this expense?")) return;
    try {
      await api.expenses.remove(e.id);
      setExpenses((list) => list.filter((x) => x.id !== e.id));
      toast({ title: "Expense deleted" });
    } catch (err: any) {
      toast({ title: "Could not delete expense", description: err?.message ?? "Please try again." });
    }
  }

  async function createCategory() {
    const name = catName.trim();
    if (!name) return;
    setSavingCat(true);
    try {
      const d = await api.expenses.createCategory({ name });
      const cat = d.category as Category;
      setCategories((list) => (list.some((c) => c.id === cat.id) ? list : [...list, cat]));
      form.setValue("categoryId", cat.id, { shouldValidate: true });
      setCatName("");
      setShowCat(false);
      toast({ title: "Category added", description: name });
    } catch (err: any) {
      toast({ title: "Could not add category", description: err?.message ?? "Please try again." });
    } finally {
      setSavingCat(false);
    }
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  function openRecCreate() {
    setRecEditing(null);
    setRecForm({
      name: "",
      amount: "",
      frequency: "MONTHLY",
      categoryId: categories[0]?.id ?? "",
      startDate: toLocalInput(new Date().toISOString()),
      autoCreate: false,
    });
    setRecOpen(true);
  }

  function openRecEdit(r: Recurring) {
    setRecEditing(r);
    setRecForm({
      name: r.name,
      amount: String(r.amount),
      frequency: (FREQUENCIES as readonly string[]).includes(r.frequency)
        ? (r.frequency as (typeof FREQUENCIES)[number])
        : "MONTHLY",
      categoryId: r.categoryId,
      startDate: toLocalInput(r.startDate),
      autoCreate: !!r.autoCreate,
    });
    setRecOpen(true);
  }

  async function saveRec(e: React.FormEvent) {
    e.preventDefault();
    if (!recForm.name.trim() || !recForm.amount.trim() || !recForm.categoryId) return;
    setRecSaving(true);
    try {
      const body = {
        name: recForm.name.trim(),
        amount: recForm.amount.trim(),
        frequency: recForm.frequency,
        categoryId: recForm.categoryId,
        startDate: new Date(recForm.startDate).toISOString(),
        autoCreate: recForm.autoCreate,
      };
      if (recEditing) await api.expenses.recurring.update(recEditing.id, body);
      else await api.expenses.recurring.create(body);
      setRecOpen(false);
      setRecEditing(null);
      await load();
      toast({ title: recEditing ? "Recurring expense updated" : "Recurring expense added" });
    } catch (err: any) {
      toast({ title: "Could not save recurring expense", description: err?.message ?? "Please try again." });
    } finally {
      setRecSaving(false);
    }
  }

  async function removeRec(r: Recurring) {
    if (!confirm(`Delete recurring expense "${r.name}"?`)) return;
    try {
      await api.expenses.recurring.remove(r.id);
      setRecurring((list) => list.filter((x) => x.id !== r.id));
      toast({ title: "Recurring expense deleted" });
    } catch (err: any) {
      toast({ title: "Could not delete recurring expense", description: err?.message ?? "Please try again." });
    }
  }

  async function toggleRec(r: Recurring) {
    try {
      const d = await api.expenses.recurring.update(r.id, { active: !r.active });
      setRecurring((list) => list.map((x) => (x.id === r.id ? (d.recurring as Recurring) : x)));
      toast({ title: r.active ? "Recurring expense paused" : "Recurring expense resumed" });
    } catch (err: any) {
      toast({ title: "Could not update recurring expense", description: err?.message ?? "Please try again." });
    }
  }

  async function logRec(r: Recurring) {
    try {
      const d = await api.expenses.recurring.log(r.id);
      setRecurring((list) => list.map((x) => (x.id === r.id ? (d.recurring as Recurring) : x)));
      if (d.expense) {
        setExpenses((list) =>
          [d.expense as Expense, ...list].sort(
            (a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime(),
          ),
        );
      }
      toast({ title: "Expense logged", description: `${r.name} · ৳${Number(r.amount).toLocaleString()}` });
    } catch (err: any) {
      toast({ title: "Could not log expense", description: err?.message ?? "Please try again." });
    }
  }

  return (
    <div className="page-wrap py-8">
      <div className="flex flex-col items-center gap-4 mb-8 text-center">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Expenses</h1>
          <p className="text-xs text-ink-3">Track your spending and budgets.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm inline-flex items-center gap-2">
          <Plus size={16} /> New expense
        </button>
      </div>

      <section className="mb-6 grid gap-3 lg:grid-cols-3">
        <StatTile label="Spent this month" value={`৳${Number(monthSpent ?? 0).toLocaleString()}`} sub="From reports" />
        <StatTile label="Transactions (loaded)" value={expenses.length} sub={`৳${total.toLocaleString()} total`} />
        <StatTile label="Categories" value={categories.length} sub="Active" />
      </section>

      <GlassPanel className="overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line/60">
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Date</th>
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Description</th>
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Category</th>
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Method</th>
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Amount</th>
                <th className="px-5 py-4 text-[10px] font-semibold uppercase text-ink-2 tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-xs text-ink-3">Loading…</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-xs text-ink-3">No expenses yet.</td></tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="group hover:bg-glass-hover transition-colors">
                    <td className="px-5 py-4"><div className="text-sm text-ink-3 tabular">{new Date(e.expenseDate).toLocaleDateString()}</div></td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-ink">{e.description || e.vendor || "Expense"}</div>
                      {e.vendor && e.description && <div className="text-[10px] text-ink-3">{e.vendor}</div>}
                    </td>
                    <td className="px-5 py-4"><span className="status-pill">{e.category?.name || "—"}</span></td>
                    <td className="px-5 py-4"><span className="text-sm text-ink-3">{e.paymentMethod.replace("_", " ")}</span></td>
                    <td className="px-5 py-4"><div className="text-sm font-semibold text-ink tabular">৳{Number(e.amount).toLocaleString()}</div></td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(e)} className="glass-interactive size-8 rounded-lg grid place-items-center text-ink-3 hover:text-ink" title="Edit">
                          <Edit size={15} />
                        </button>
                        <button onClick={() => remove(e)} className="glass-interactive size-8 rounded-lg grid place-items-center text-ink-3 hover:text-error" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      <GlassPanel className="overflow-hidden rounded-2xl mt-6">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line/60">
          <div>
            <h2 className="text-sm font-semibold text-ink inline-flex items-center gap-2">
              <Repeat size={15} className="text-accent" /> Recurring expenses
            </h2>
            <p className="text-[11px] text-ink-3 mt-0.5">
              Rent, subscriptions and bills. Log each one with a single click, or let auto-create post them automatically.
            </p>
          </div>
          <button onClick={openRecCreate} className="btn-ghost text-xs inline-flex items-center gap-1 shrink-0">
            <Plus size={14} /> Add
          </button>
        </div>

        {recurring.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-ink-3">
            No recurring expenses yet.
            <button onClick={openRecCreate} className="text-accent hover:underline ml-1">Add your first one</button>
          </div>
        ) : (
          <div className="divide-y divide-line/60">
            {recurring.map((r) => (
              <div key={r.id} className={`px-5 py-3 flex items-center gap-3 ${r.active ? "" : "opacity-60"}`}>
                <div className="size-9 rounded-lg bg-white/5 grid place-items-center text-accent shrink-0">
                  <Repeat size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-ink truncate">{r.name}</span>
                    {!r.active && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-line text-ink-3">Paused</span>
                    )}
                    {r.autoCreate && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-accent/40 text-accent">Auto</span>
                    )}
                  </div>
                  <div className="text-[11px] text-ink-3 tabular">
                    {r.category?.name ?? "Uncategorised"} · {FREQUENCY_LABEL[r.frequency] ?? r.frequency} ·{" "}
                    {r.active ? "next" : "was due"} {new Date(r.nextExpectedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-sm font-semibold text-ink tabular shrink-0 mr-1">
                  ৳{Number(r.amount).toLocaleString()}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => logRec(r)}
                    disabled={!r.active}
                    className="h-7 px-2 rounded-lg border border-line text-[11px] text-ink-2 hover:bg-glass-hover disabled:opacity-40 inline-flex items-center gap-1"
                    title="Log one occurrence now"
                  >
                    <Check size={12} /> Log
                  </button>
                  <button
                    onClick={() => toggleRec(r)}
                    className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink"
                    title={r.active ? "Pause" : "Resume"}
                  >
                    {r.active ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button
                    onClick={() => openRecEdit(r)}
                    className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink"
                    title="Edit"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => removeRec(r)}
                    className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-error"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>

      {recOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRecOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0f1a] p-5 shadow-2xl" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-ink">
                {recEditing ? "Edit recurring expense" : "New recurring expense"}
              </h3>
              <button onClick={() => setRecOpen(false)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={saveRec} className="space-y-3">
              <div>
                <label className="block text-xs text-ink-2 mb-1">Name</label>
                <input
                  value={recForm.name}
                  onChange={(ev) => setRecForm((f) => ({ ...f, name: ev.target.value }))}
                  className="input-glass"
                  placeholder="e.g. Internet bill"
                  maxLength={120}
                />
              </div>
              <div className="grid gap-3 grid-cols-2">
                <div>
                  <label className="block text-xs text-ink-2 mb-1">Amount (৳)</label>
                  <input
                    value={recForm.amount}
                    onChange={(ev) => setRecForm((f) => ({ ...f, amount: ev.target.value }))}
                    className="input-glass"
                    placeholder="0.00"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-2 mb-1">Frequency</label>
                  <select
                    value={recForm.frequency}
                    onChange={(ev) => setRecForm((f) => ({ ...f, frequency: ev.target.value as (typeof FREQUENCIES)[number] }))}
                    className="input-glass"
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f} value={f} className="bg-[#0b0f1a]">{FREQUENCY_LABEL[f]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-ink-2 mb-1">Category</label>
                  <select
                    value={recForm.categoryId}
                    onChange={(ev) => setRecForm((f) => ({ ...f, categoryId: ev.target.value }))}
                    className="input-glass"
                  >
                    <option value="" className="bg-[#0b0f1a]">Select category…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#0b0f1a]">{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-ink-2 mb-1">Next due</label>
                  <input
                    type="datetime-local"
                    value={recForm.startDate}
                    onChange={(ev) => setRecForm((f) => ({ ...f, startDate: ev.target.value }))}
                    className="input-glass"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-ink-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recForm.autoCreate}
                  onChange={(ev) => setRecForm((f) => ({ ...f, autoCreate: ev.target.checked }))}
                  className="accent-[var(--accent)]"
                />
                Automatically create the expense when due
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setRecOpen(false)} className="btn-ghost text-xs">Cancel</button>
                <button
                  type="submit"
                  disabled={recSaving || !recForm.name.trim() || !recForm.amount.trim() || !recForm.categoryId}
                  className="btn-primary text-xs"
                >
                  {recSaving ? "Saving…" : recEditing ? "Save changes" : "Add recurring"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0f1a] p-5 shadow-2xl" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-ink">{editing ? "Edit expense" : "New expense"}</h3>
              <button onClick={() => setOpen(false)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={form.handleSubmit(save)} className="space-y-3">
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                <div>
                  <label className="block text-xs text-ink-2 mb-1">Amount (৳)</label>
                  <input {...form.register("amount")} className="input-glass" placeholder="0.00" inputMode="decimal" />
                  {form.formState.errors.amount && <p className="text-[10px] text-error mt-1">{form.formState.errors.amount.message}</p>}
                </div>
                <div>
                  <label className="block text-xs text-ink-2 mb-1">Date</label>
                  <input type="datetime-local" {...form.register("expenseDate")} className="input-glass" />
                  {form.formState.errors.expenseDate && <p className="text-[10px] text-error mt-1">{form.formState.errors.expenseDate.message}</p>}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs text-ink-2">Category</label>
                    <button type="button" onClick={() => setShowCat((v) => !v)} className="text-[10px] text-accent hover:underline">
                      {showCat ? "Cancel" : "+ New"}
                    </button>
                  </div>
                  <select {...form.register("categoryId")} className="input-glass">
                    <option value="" className="bg-[#0b0f1a]">Select category…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#0b0f1a]">{c.name}</option>
                    ))}
                  </select>
                  {form.formState.errors.categoryId && <p className="text-[10px] text-error mt-1">{form.formState.errors.categoryId.message}</p>}
                </div>
                <div>
                  <label className="block text-xs text-ink-2 mb-1">Method</label>
                  <select {...form.register("paymentMethod")} className="input-glass">
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m} className="bg-[#0b0f1a]">{m.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
              </div>

              {showCat && (
                <div className="flex items-center gap-2 rounded-xl border border-line p-2">
                  <input
                    value={catName}
                    onChange={(ev) => setCatName(ev.target.value)}
                    placeholder="New category name"
                    className="flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-ink-3 px-1"
                  />
                  <button
                    type="button"
                    onClick={() => createCategory()}
                    disabled={savingCat || !catName.trim()}
                    className="text-[11px] px-2 py-1 rounded-lg border border-line text-ink-2 hover:bg-glass-hover disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    <Check size={11} /> {savingCat ? "Saving…" : "Add"}
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs text-ink-2 mb-1">Description</label>
                <input {...form.register("description")} className="input-glass" placeholder="e.g. Grocery store" />
              </div>
              <div>
                <label className="block text-xs text-ink-2 mb-1">Vendor (optional)</label>
                <input {...form.register("vendor")} className="input-glass" placeholder="e.g. Shwapno" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-xs">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-xs">
                  {saving ? "Saving…" : editing ? "Save changes" : "Add expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
