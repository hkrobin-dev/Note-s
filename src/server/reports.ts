import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { ReportQueryInput } from "@/lib/validation/report";
import type { BudgetVsActual, ReportSummary } from "@/lib/validation/report";

function toNum(d: unknown): number {
  if (d == null) return 0;
  if (typeof d === "object" && "toNumber" in d) return (d as { toNumber: () => number }).toNumber();
  return Number(d);
}

export async function getReportSummary(query: ReportQueryInput): Promise<ReportSummary> {
  const month = query.month ?? new Date();
  const [y, m] = [month.getUTCFullYear(), month.getUTCMonth()];
  const monthStart = new Date(Date.UTC(y, m, 1));
  const monthEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));

  const where: Prisma.ExpenseWhereInput = {
    expenseDate: { gte: monthStart, lte: monthEnd },
  };
  if (query.categoryId) where.categoryId = query.categoryId;

  const [budgets, expenses, income] = await Promise.all([
    prisma.budget.findMany({
      where: { month: monthStart, categoryId: query.categoryId },
      include: { category: { select: { id: true, name: true, color: true } } },
    }),
    prisma.expense.findMany({ where, include: { category: { select: { id: true, name: true, color: true } } } }),
    prisma.incomeRecord.aggregate({
      where: { incomeDate: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
  ]);

  const budgeted = budgets.reduce((sum, b) => sum + toNum(b.amount), 0);
  const spent = expenses.reduce((sum, e) => sum + toNum(e.amount), 0);
  const incomeAmount = toNum(income._sum.amount);

  return {
    month: monthStart.toISOString().slice(0, 7),
    budgeted,
    spent,
    income: incomeAmount,
    remaining: incomeAmount - spent,
  };
}

export async function getBudgetVsActual(query: ReportQueryInput): Promise<BudgetVsActual[]> {
  const month = query.month ?? new Date();
  const [y, m] = [month.getUTCFullYear(), month.getUTCMonth()];
  const monthStart = new Date(Date.UTC(y, m, 1));
  const monthEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));

  const [budgets, expenses] = await Promise.all([
    prisma.budget.findMany({
      where: { month: monthStart, categoryId: query.categoryId },
      include: { category: { select: { id: true, name: true, color: true } } },
    }),
    prisma.expense.findMany({
      where: {
        expenseDate: { gte: monthStart, lte: monthEnd },
        categoryId: query.categoryId,
      },
      include: { category: { select: { id: true, name: true, color: true } } },
    }),
  ]);

  const spentByCategory = new Map<string, number>();
  for (const e of expenses) {
    const cid = (e.categoryId ?? "") as string;
    spentByCategory.set(cid, (spentByCategory.get(cid) ?? 0) + toNum(e.amount));
  }

  return budgets.map((b) => {
    const spent = spentByCategory.get(b.categoryId ?? "") ?? 0;
    const budgeted = toNum(b.amount);
    return {
      categoryId: b.categoryId,
      categoryName: b.category?.name ?? null,
      categoryColor: b.category?.color ?? null,
      budgeted,
      spent,
      remaining: budgeted - spent,
    };
  });
}
