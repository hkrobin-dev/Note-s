"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { confirmDialog } from "@/components/dialog/confirm";
import { useToast } from "@/components/toast/toaster";
import { Plus, Trash2, TrendingUp, Wallet, Pencil, X } from "lucide-react";
import { format, startOfMonth } from "date-fns";

type Income = { id: string; amount: number | string; incomeDate: string; source: string; description?: string | null };

function toDateInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function IncomePage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");
  const [incomeDate, setIncomeDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<Income | null>(null);
  const [eAmount, setEAmount] = useState("");
  const [eSource, setESource] = useState("");
  const [eDescription, setEDescription] = useState("");
  const [eDate, setEDate] = useState("");
  const [eSaving, setESaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const d = await api.income.list();
      setItems(
        ((d.incomes ?? []) as Income[]).sort(
          (a, b) => new Date(b.incomeDate).getTime() - new Date(a.incomeDate).getTime(),
        ),
      );
    } catch (err: any) {
      toast({ title: "Could not load income", description: err?.message ?? "Check that the backend is running." });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const totals = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    let month = 0;
    let all = 0;
    for (const it of items) {
      const value = Number(it.amount);
      all += value;
      if (new Date(it.incomeDate) >= monthStart) month += value;
    }
    return { month, all };
  }, [items]);

  async function addIncome(e: React.FormEvent) {
    e.preventDefault();
    const clean = amount.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(clean)) {
      toast({ title: "Enter a valid amount", description: "Use numbers like 5000 or 1250.50." });
      return;
    }
    if (!source.trim()) return;
    setSaving(true);
    try {
      await api.income.create({
        amount: clean,
        source: source.trim(),
        description: description.trim() || null,
        incomeDate: new Date(`${incomeDate}T12:00:00`).toISOString(),
      });
      setAmount("");
      setSource("");
      setDescription("");
      await load();
      toast({ title: "Income added" });
    } catch (err: any) {
      toast({ title: "Could not add income", description: err?.message ?? "Please try again." });
    } finally {
      setSaving(false);
    }
  }

  function openEdit(it: Income) {
    setEditing(it);
    setEAmount(String(it.amount));
    setESource(it.source);
    setEDescription(it.description ?? "");
    setEDate(toDateInput(it.incomeDate));
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const clean = eAmount.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(clean) || !eSource.trim()) {
      toast({ title: "Check the fields", description: "Amount and source are required." });
      return;
    }
    setESaving(true);
    try {
      const d = await api.income.update(editing.id, {
        amount: clean,
        source: eSource.trim(),
        description: eDescription.trim() || null,
        incomeDate: new Date(`${eDate}T12:00:00`).toISOString(),
      });
      const updated = d.income as Income;
      setItems((list) =>
        list
          .map((x) => (x.id === editing.id ? { ...x, ...updated } : x))
          .sort((a, b) => new Date(b.incomeDate).getTime() - new Date(a.incomeDate).getTime()),
      );
      setEditing(null);
      toast({ title: "Income updated" });
    } catch (err: any) {
      toast({ title: "Could not update income", description: err?.message ?? "Please try again." });
    } finally {
      setESaving(false);
    }
  }

  async function remove(it: Income) {
    if (!(await confirmDialog(`Delete "${it.source}" (৳${Number(it.amount).toLocaleString()})?`))) return;
    try {
      await api.income.remove(it.id);
      setItems((list) => list.filter((x) => x.id !== it.id));
      toast({ title: "Income deleted" });
    } catch (err: any) {
      toast({ title: "Could not delete income", description: err?.message ?? "Please try again." });
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Income</h1>
        <p className="text-xs text-ink-3 mt-1">Track money coming in — salary, freelance, refunds and more.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <div className="glass rounded-2xl border border-white/10 p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-3">This month</div>
          <div className="mt-1 text-xl font-semibold text-ink tabular">৳{totals.month.toLocaleString()}</div>
        </div>
        <div className="glass rounded-2xl border border-white/10 p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-3">All time</div>
          <div className="mt-1 text-xl font-semibold text-ink tabular">৳{totals.all.toLocaleString()}</div>
        </div>
        <div className="glass rounded-2xl border border-white/10 p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-3">Entries</div>
          <div className="mt-1 text-xl font-semibold text-ink tabular">{items.length}</div>
        </div>
      </div>

      <form onSubmit={addIncome} className="glass rounded-2xl p-5 mb-6 grid gap-3 sm:grid-cols-2">
        <input
          className="px-3 py-2 rounded-lg border border-line bg-transparent text-sm text-ink"
          placeholder="Amount (e.g. 5000)"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input className="px-3 py-2 rounded-lg border border-line bg-transparent text-sm text-ink" placeholder="Source (Salary, Freelance...)" value={source} onChange={(e) => setSource(e.target.value)} />
        <input className="px-3 py-2 rounded-lg border border-line bg-transparent text-sm text-ink" placeholder="Note (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input type="date" className="px-3 py-2 rounded-lg border border-line bg-transparent text-sm text-ink" value={incomeDate} onChange={(e) => setIncomeDate(e.target.value)} />
        <button type="submit" disabled={saving} className="btn-primary text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60 sm:col-span-2">
          <Plus size={16} /> {saving ? "Adding…" : "Add income"}
        </button>
      </form>

      <div className="glass rounded-2xl overflow-hidden border border-white/10">
        <div className="px-5 py-4 border-b border-white/10 text-sm font-semibold text-ink-2 uppercase tracking-wider">Entries</div>
        {loading ? (
          <div className="p-6 text-sm text-ink-3">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <Wallet className="mx-auto text-ink-3" size={26} />
            <div className="text-sm text-ink-2 font-medium mt-2">No income entries yet</div>
            <div className="text-xs text-ink-3 mt-1">Add your first entry above.</div>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {items.map((it) => (
              <div key={it.id} className="group px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid size-8 rounded-xl place-items-center bg-emerald-400/10 text-emerald-300 shrink-0">
                    <TrendingUp size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink truncate">{it.source}</div>
                    <div className="text-[11px] text-ink-3">
                      {format(new Date(it.incomeDate), "MMM d, yyyy")}
                      {it.description ? ` · ${it.description}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-sm font-semibold text-emerald-300 tabular mr-1">+৳{Number(it.amount).toLocaleString()}</div>
                  <button
                    onClick={() => openEdit(it)}
                    className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink"
                    aria-label="Edit income"
                  >
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => remove(it)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-red-400" aria-label="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0f1a] p-5 shadow-2xl" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-ink">Edit income</h3>
              <button onClick={() => setEditing(null)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={saveEdit} className="space-y-3">
              <div className="grid gap-3 grid-cols-2">
                <div>
                  <label className="block text-xs text-ink-2 mb-1">Amount (৳)</label>
                  <input value={eAmount} onChange={(e) => setEAmount(e.target.value)} className="input-glass" inputMode="decimal" />
                </div>
                <div>
                  <label className="block text-xs text-ink-2 mb-1">Date</label>
                  <input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} className="input-glass" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-ink-2 mb-1">Source</label>
                <input value={eSource} onChange={(e) => setESource(e.target.value)} className="input-glass" maxLength={120} />
              </div>
              <div>
                <label className="block text-xs text-ink-2 mb-1">Note (optional)</label>
                <input value={eDescription} onChange={(e) => setEDescription(e.target.value)} className="input-glass" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="btn-ghost text-xs">Cancel</button>
                <button type="submit" disabled={eSaving} className="btn-primary text-xs">
                  {eSaving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
