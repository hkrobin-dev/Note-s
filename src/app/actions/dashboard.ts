"use server";

import { prisma } from "@/lib/db";
import { dhakaDayBounds, dhakaMonthKey } from "@/lib/dates";

export type DashboardTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
};

export type DashboardEvent = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  eventType: string;
  location: string | null;
};

export type DashboardProject = {
  id: string;
  name: string;
  status: string;
  priority: string;
  deadline: string | null;
  taskCount: number;
  openTasks: number;
  progress: number | null;
  description: string | null;
};

export type DashboardActivity = {
  id: string;
  entityType: string;
  action: string;
  detail: unknown;
  createdAt: string;
};

export type DashboardData = {
  tasksToday: DashboardTask[];
  tasksDoneToday: number;
  tasksRemainingToday: number;
  spentThisMonth: number;
  monthlyBudget: number;
  remainingBudget: number;
  budgetPct: number;
  eventsToday: DashboardEvent[];
  nextReminder: { message: string; at: string } | null;
  projects: DashboardProject[];
  recentActivity: DashboardActivity[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const today = dhakaDayBounds();
  const monthKey = dhakaMonthKey(new Date());
  const [year, month] = monthKey.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const [
    tasksToday,
    expensesThisMonth,
    budgetsThisMonth,
    incomeThisMonth,
    eventsToday,
    nextReminder,
    projects,
    recentActivity,
  ] = await Promise.all([
    prisma.task.findMany({
      where: {
        dueDate: { gte: today.start, lte: today.end },
      },
      include: {
        project: { select: { id: true, name: true, accentColor: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 20,
    }),
    prisma.expense.aggregate({
      where: {
        expenseDate: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.budget.aggregate({
      where: {
        month: monthStart,
      },
      _sum: { amount: true },
    }),
    prisma.incomeRecord.aggregate({
      where: {
        incomeDate: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.calendarEvent.findMany({
      where: {
        startAt: { gte: today.start, lte: today.end },
      },
      orderBy: [{ startAt: "asc" }],
      take: 20,
    }),
    prisma.reminder.findFirst({
      where: {
        status: "PENDING",
        scheduledAt: { lte: new Date() },
      },
      orderBy: { scheduledAt: "asc" },
      select: { message: true, scheduledAt: true },
    }),
    prisma.project.findMany({
      include: {
        _count: { select: { tasks: true } },
        tasks: {
          select: { id: true, status: true },
          orderBy: { dueDate: "asc" },
          take: 5,
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 10,
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const spent = expensesThisMonth._sum.amount
    ? Number(expensesThisMonth._sum.amount.toString())
    : 0;
  const budgeted = budgetsThisMonth._sum.amount
    ? Number(budgetsThisMonth._sum.amount.toString())
    : 0;
  const incomeAmount = incomeThisMonth._sum.amount
    ? Number(incomeThisMonth._sum.amount.toString())
    : 0;
  const remaining = incomeAmount - spent;
  const pct = budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0;

  const doneToday = tasksToday.filter((t) => t.status === "DONE").length;
  const remainingToday = tasksToday.length - doneToday;

  return {
    tasksToday: tasksToday.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate?.toISOString() ?? null,
    })),
    tasksDoneToday: doneToday,
    tasksRemainingToday: remainingToday,
    spentThisMonth: spent,
    monthlyBudget: budgeted,
    remainingBudget: remaining,
    budgetPct: pct,
    eventsToday: eventsToday.map((e) => ({
      id: e.id,
      title: e.title,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt.toISOString(),
      allDay: e.allDay,
      eventType: e.eventType,
      location: e.location,
    })),
    nextReminder:
      nextReminder && nextReminder.scheduledAt
        ? {
            message: nextReminder.message,
            at: nextReminder.scheduledAt.toISOString(),
          }
        : null,
    projects: projects.map((p) => {
      const tasks = p.tasks as { id: string; status: string }[];
      const openTasks = tasks.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED").length;
      const trackable = tasks.filter((t) => t.status !== "CANCELLED").length;
      const progress = trackable === 0 ? null : (tasks.filter((t) => t.status === "DONE").length / trackable);
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        priority: p.priority,
        deadline: p.deadline?.toISOString() ?? null,
        taskCount: (p as { _count: { tasks: number } })._count.tasks,
        openTasks,
        progress,
        description: p.description,
      };
    }),
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      entityType: a.entityType,
      action: a.action,
      detail: a.detail,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}
