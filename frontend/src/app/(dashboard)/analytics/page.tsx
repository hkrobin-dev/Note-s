"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Activity, CheckCircle2, Target, TrendingUp, Timer, Flame } from "lucide-react";

type Summary = {
  tasks: { total: number; byStatus: Record<string, number>; dueSoon: number; completedThisWeek: number };
  series: { days: string[]; completedTasks: number[]; timeMins: number[]; habitCheckins: number[] };
  habits: { active: number; todayDone: number };
  finance: {
    months: { key: string; label: string; income: number; expense: number }[];
    expensesByCategory: { name: string; amount: number }[];
  };
  goals: { total: number; completed: number; avgProgress: number };
  projects: { id: string; name: string; tasks: number }[];
};

const STATUS_LABEL: Record<string, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

function money(n: number) {
  return `৳${Math.round(n).toLocaleString()}`;
}

function BarChart({ data, color, suffix }: { data: number[]; color: string; suffix?: string }) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="text-[9px] text-ink-3 tabular">{v > 0 ? `${v}${suffix ?? ""}` : ""}</div>
          <div
            className={`w-full rounded-t ${color}`}
            style={{ height: `${Math.max(2, (v / max) * 100)}%` }}
            title={`${v}${suffix ?? ""}`}
          />
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const d = await api.analytics.summary();
        setData(d as Summary);
      } catch (e) {
        console.error(e);
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="p-4 md:p-8 text-sm text-ink-3">Loading analytics…</div>;
  }
  if (!data) {
    return <div className="p-4 md:p-8 text-sm text-ink-3">Could not load analytics.</div>;
  }

  const totalStatus = Math.max(1, Object.values(data.tasks.byStatus).reduce((a, b) => a + b, 0));
  const financeMax = Math.max(1, ...data.finance.months.flatMap((m) => [m.income, m.expense]));
  const categoryTotal = Math.max(1, data.finance.expensesByCategory.reduce((s, c) => s + c.amount, 0));

  const kpis = [
    { label: "Tasks", value: data.tasks.total, sub: `${data.tasks.dueSoon} due soon`, icon: CheckCircle2 },
    { label: "Done this week", value: data.tasks.completedThisWeek, sub: "completed", icon: TrendingUp },
    { label: "Habits today", value: `${data.habits.todayDone}/${data.habits.active}`, sub: "checked in", icon: Flame },
    { label: "Goal progress", value: `${data.goals.avgProgress}%`, sub: `${data.goals.completed}/${data.goals.total} done`, icon: Target },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Analytics</h1>
        <p className="text-xs text-ink-3 mt-1">A weekly and monthly view of your momentum.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {kpis.map((k) => (
          <div key={k.label} className="glass rounded-2xl border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-ink-3">{k.label}</span>
              <k.icon size={15} className="text-accent" />
            </div>
            <div className="mt-2 text-2xl font-bold text-ink tabular">{k.value}</div>
            <div className="text-[11px] text-ink-3">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mb-4">
        <div className="glass rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Timer size={15} className="text-accent" />
            <h2 className="text-sm font-semibold text-ink">Focus time this week</h2>
          </div>
          <BarChart data={data.series.timeMins} color="bg-accent" suffix="m" />
          <div className="mt-2 flex justify-between text-[10px] text-ink-3">
            {data.series.days.map((d, i) => <span key={i}>{d}</span>)}
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={15} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-ink">Tasks completed</h2>
          </div>
          <BarChart data={data.series.completedTasks} color="bg-emerald-400" />
          <div className="mt-2 flex justify-between text-[10px] text-ink-3">
            {data.series.days.map((d, i) => <span key={i}>{d}</span>)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mb-4">
        <div className="glass rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={15} className="text-accent" />
            <h2 className="text-sm font-semibold text-ink">Task status</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(data.tasks.byStatus).map(([status, count]) => (
              <div key={status}>
                <div className="flex justify-between text-[11px] text-ink-2 mb-1">
                  <span>{STATUS_LABEL[status] ?? status}</span>
                  <span className="tabular">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(count / totalStatus) * 100}%` }} />
                </div>
              </div>
            ))}
            {Object.keys(data.tasks.byStatus).length === 0 && <div className="text-xs text-ink-3">No tasks yet.</div>}
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={15} className="text-accent" />
            <h2 className="text-sm font-semibold text-ink">Habit check-ins (7 days)</h2>
          </div>
          <BarChart data={data.series.habitCheckins} color="bg-orange-400" />
          <div className="mt-2 flex justify-between text-[10px] text-ink-3">
            {data.series.days.map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="mt-3 text-[11px] text-ink-3">
            {data.habits.active === 0 ? "No active habits. Add some on the Habits page." : `${data.habits.todayDone} of ${data.habits.active} done today.`}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-ink mb-4">Income vs expenses (6 months)</h2>
          <div className="flex items-end gap-3 h-40">
            {data.finance.months.map((m) => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-end gap-1 w-full h-full">
                  <div className="flex-1 bg-emerald-400/80 rounded-t" style={{ height: `${(m.income / financeMax) * 100}%` }} title={`Income ${money(m.income)}`} />
                  <div className="flex-1 bg-red-400/80 rounded-t" style={{ height: `${(m.expense / financeMax) * 100}%` }} title={`Expense ${money(m.expense)}`} />
                </div>
                <span className="text-[10px] text-ink-3">{m.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-[10px] text-ink-3">
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded bg-emerald-400" /> Income</span>
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded bg-red-400" /> Expense</span>
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-ink mb-4">Spending by category (this month)</h2>
          {data.finance.expensesByCategory.length === 0 ? (
            <div className="text-xs text-ink-3">No expenses this month.</div>
          ) : (
            <div className="space-y-3">
              {data.finance.expensesByCategory.slice(0, 6).map((c) => (
                <div key={c.name}>
                  <div className="flex justify-between text-[11px] text-ink-2 mb-1">
                    <span>{c.name}</span>
                    <span className="tabular">{money(c.amount)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-red-400" style={{ width: `${(c.amount / categoryTotal) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {data.projects.length > 0 && (
        <div className="glass rounded-2xl border border-white/10 p-5 mt-4">
          <h2 className="text-sm font-semibold text-ink mb-3">Active projects</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.projects.map((p) => (
              <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-sm text-ink truncate">{p.name}</div>
                <div className="text-[11px] text-ink-3">{p.tasks} task{p.tasks === 1 ? "" : "s"}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
