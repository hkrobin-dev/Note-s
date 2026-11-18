"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, ChartNoAxesColumn, Wallet } from "lucide-react";
import { fetchReport, fetchReportByMonth, formatMoney } from "@/features/reports/api";
import type { BudgetVsActual, ReportSummary } from "@/lib/validation/report";
import { progressPct } from "@/features/reports/format";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  ListSkeleton,
  PageHeader,
  Progress,
  StatCard,
} from "@/components/ui";
import { cn } from "@/lib/utils";

export function ReportsView() {
  const [month, setMonth] = useState("");

  const query = useQuery({
    queryKey: ["reports", month],
    queryFn: () => (month ? fetchReportByMonth(month) : fetchReport()),
  });

  const data = query.data;
  const summary: ReportSummary = data?.summary ?? {
    month: "",
    budgeted: 0,
    spent: 0,
    income: 0,
    remaining: 0,
  };
  const rows: BudgetVsActual[] = data?.budgetVsActual ?? [];

  const monthLabel = summary.month
    ? (() => {
        const [year, monthNumber] = summary.month.split("-").map(Number);
        return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
          new Date(Date.UTC(year, monthNumber - 1, 1)),
        );
      })()
    : "This month";

  const net = summary.income - summary.spent;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Money"
        title="Budgets & reports"
        description="See how actual spending compares with the plan for each category."
        actions={
          <label className="flex items-center gap-2 text-xs text-ink-3">
            Month
            <Input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="h-9 w-auto"
            />
          </label>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Budgeted" value={formatMoney(summary.budgeted)} icon={ChartNoAxesColumn} />
        <StatCard label="Spent" value={formatMoney(summary.spent)} icon={Wallet} />
        <StatCard
          label="Income"
          value={formatMoney(summary.income)}
          tone="positive"
          icon={ArrowUpRight}
        />
        <StatCard
          label="Net this month"
          value={formatMoney(net)}
          tone={net >= 0 ? "positive" : "error"}
          icon={net >= 0 ? ArrowUpRight : ArrowDownRight}
          hint="Income minus expenses"
        />
      </section>

      {query.isError ? <Alert>{query.error.message}</Alert> : null}

      <Card>
        <CardHeader
          title={`Category breakdown — ${monthLabel}`}
          description={`${rows.length} categor${rows.length === 1 ? "y" : "ies"} with a budget`}
        />
        {query.isPending ? (
          <ListSkeleton rows={4} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ChartNoAxesColumn}
            title="No budget data for this month"
            description="Add a budget category to compare planned versus actual spending."
          />
        ) : (
          <div className="border-t border-line">
            <ul className="divide-y divide-line">
              {rows.map((row) => {
                const pct = progressPct(row.spent, row.budgeted);
                const over = row.budgeted - row.spent < 0;
                const remainingPct = 100 - pct;
                return (
                  <li key={row.categoryId ?? row.categoryName ?? ""} className="px-5 py-3.5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            over ? "bg-error" : "bg-positive",
                          )}
                          aria-hidden
                        />
                        <span className="truncate text-[13px] font-medium text-ink">
                          {row.categoryName ?? "Uncategorized"}
                        </span>
                        <Badge tone={over ? "error" : "positive"}>{over ? "Over budget" : "On track"}</Badge>
                      </div>
                      <span className="tabular shrink-0 text-xs text-ink-2">
                        {formatMoney(row.spent)} <span className="text-ink-3">/ {formatMoney(row.budgeted)}</span>
                      </span>
                    </div>
                    <Progress value={pct} tone={over ? "error" : "positive"} className="mt-2.5" />
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-3">
                      <span>
                        {over ? "Over by " : "Remaining "}
                        {formatMoney(Math.abs(row.remaining))}
                      </span>
                      <span>
                        {pct}% used · {remainingPct}% left
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Summary" description={monthLabel} />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-line bg-surface-2 p-4">
              <p className="text-[11px] font-medium tracking-wide text-ink-3 uppercase">
                Budgeted vs spent
              </p>
              <p className="tabular mt-1.5 text-lg font-semibold text-ink">
                {formatMoney(summary.budgeted)} <span className="text-ink-3">→</span>{" "}
                {formatMoney(summary.spent)}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2 p-4">
              <p className="text-[11px] font-medium tracking-wide text-ink-3 uppercase">
                Income vs expenses
              </p>
              <p className="tabular mt-1.5 text-lg font-semibold text-ink">
                {formatMoney(summary.income)} <span className="text-ink-3">→</span>{" "}
                {formatMoney(summary.spent)}
              </p>
            </div>
          </div>
          {rows.length > 0 ? (
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => query.refetch()}>
                Refresh report
              </Button>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
