import { Router } from "../lib/async-router";
import { prisma } from "../lib/prisma";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

router.get("/summary", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const now = new Date();
  const today = startOfDay(now);
  const weekStart = addDays(today, -6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [tasksByStatus, tasksDue, completedWeek, expensesByCategory, incomeTotals, expenseTotals, timeEntries, habits, goals, projects] =
    await Promise.all([
      prisma.task.groupBy({ by: ["status"], where: { userId }, _count: { _all: true } }),
      prisma.task.count({ where: { userId, status: { not: "DONE" }, dueDate: { lte: addDays(today, 1) } } }),
      prisma.task.findMany({
        where: { userId, completedAt: { gte: weekStart, lte: now } },
        select: { completedAt: true },
      }),
      prisma.expense.groupBy({
        by: ["categoryId"],
        where: { userId, expenseDate: { gte: monthStart, lte: now } },
        _sum: { amount: true },
      }),
      prisma.incomeRecord.findMany({
        where: { userId, incomeDate: { gte: sixMonthsAgo } },
        select: { incomeDate: true, amount: true },
      }),
      prisma.expense.findMany({
        where: { userId, expenseDate: { gte: sixMonthsAgo } },
        select: { expenseDate: true, amount: true },
      }),
      prisma.timeEntry.findMany({
        where: { userId, startAt: { gte: weekStart } },
        select: { startAt: true, durationMins: true },
      }),
      prisma.habit.findMany({
        where: { userId, active: true },
        include: { logs: { where: { date: { gte: weekStart } }, select: { date: true } } },
      }),
      prisma.goal.findMany({
        where: { userId, status: { not: "ARCHIVED" } },
        select: { targetValue: true, currentValue: true, status: true },
      }),
      prisma.project.findMany({
        where: { userId, archivedAt: null },
        select: { id: true, name: true, _count: { select: { tasks: true } } },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

  const categories = await prisma.expenseCategory.findMany({ where: { userId } });
  const catMap = new Map(categories.map((c: any) => [c.id, c.name]));

  // Daily series (last 7 days)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const completedSeries = days.map((d) => {
    const next = addDays(d, 1);
    return completedWeek.filter((t) => t.completedAt && t.completedAt >= d && t.completedAt < next).length;
  });
  const timeSeries = days.map((d) => {
    const next = addDays(d, 1);
    return timeEntries
      .filter((t) => t.startAt >= d && t.startAt < next)
      .reduce((sum, t) => sum + (t.durationMins ?? 0), 0);
  });

  const habitSeries = days.map((d) => {
    const next = addDays(d, 1);
    return habits.reduce((sum, h) => sum + (h.logs.some((l: any) => l.date >= d && l.date < next) ? 1 : 0), 0);
  });

  const expensesByCategoryOut = expensesByCategory
    .map((e: any) => ({
      name: e.categoryId ? catMap.get(e.categoryId) ?? "Uncategorized" : "Uncategorized",
      amount: Number(e._sum.amount || 0),
    }))
    .sort((a, b) => b.amount - a.amount);

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = monthKey(d);
    return {
      key,
      label: d.toLocaleDateString(undefined, { month: "short" }),
      income: incomeTotals.filter((r) => monthKey(new Date(r.incomeDate)) === key).reduce((s, r) => s + Number(r.amount), 0),
      expense: expenseTotals.filter((r) => monthKey(new Date(r.expenseDate)) === key).reduce((s, r) => s + Number(r.amount), 0),
    };
  });

  const statusCounts: Record<string, number> = {};
  for (const row of tasksByStatus) statusCounts[row.status] = row._count._all;

  const goalsDone = goals.filter((g: any) => g.status === "COMPLETED").length;
  const goalProgress =
    goals.length === 0
      ? 0
      : Math.round(
          goals.reduce((sum: number, g: any) => {
            const t = Number(g.targetValue) || 0;
            return sum + (t > 0 ? Math.min(100, (Number(g.currentValue) / t) * 100) : 0);
          }, 0) / goals.length,
        );

  res.json({
    tasks: {
      total: tasksByStatus.reduce((s, r) => s + r._count._all, 0),
      byStatus: statusCounts,
      dueSoon: tasksDue,
      completedThisWeek: completedWeek.length,
    },
    series: {
      days: days.map((d) => d.toLocaleDateString(undefined, { weekday: "short" })),
      completedTasks: completedSeries,
      timeMins: timeSeries,
      habitCheckins: habitSeries,
    },
    habits: {
      active: habits.length,
      todayDone: habits.filter((h: any) => h.logs.some((l: any) => l.date >= today)).length,
    },
    finance: {
      months,
      expensesByCategory: expensesByCategoryOut,
    },
    goals: { total: goals.length, completed: goalsDone, avgProgress: goalProgress },
    projects: projects.map((p: any) => ({ id: p.id, name: p.name, tasks: p._count.tasks })),
  });
});

export default router;
