import { Router } from "express";
import { query, validationResult } from "express-validator";
import { prisma } from "../lib/prisma";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

// Dashboard summary
router.get("/dashboard", query("month").optional().isISO8601(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const now = new Date();
  const month = req.query?.month ? new Date(req.query?.month as string) : now;
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);

  const [tasks, events, expenses, income, budgets, reminders] = await Promise.all([
    prisma.task.aggregate({ where: { userId }, _count: true }),
    prisma.calendarEvent.count({ where: { userId, startAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.expense.aggregate({ where: { userId, expenseDate: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } }),
    prisma.incomeRecord.aggregate({ where: { userId, incomeDate: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } }),
    prisma.budget.findMany({ where: { userId, month: monthStart } }),
    prisma.reminder.count({ where: { userId, status: "PENDING" } }),
  ]);

  const spent = Number(expenses._sum.amount || 0);
  const earned = Number(income._sum.amount || 0);
  const budgetTotal = budgets.reduce((sum: number, b: any) => sum + Number(b.amount), 0);

  res.json({
    taskCount: tasks._count,
    eventCount: events,
    spentThisMonth: spent,
    earnedThisMonth: earned,
    remainingBudget: budgetTotal - spent,
    budgetUsed: budgetTotal > 0 ? Math.round((spent / budgetTotal) * 100) : 0,
    pendingReminders: reminders,
  });
});

// Recent activity
router.get("/activity", query("limit").optional().isInt({ min: 1, max: 100 }), async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const limit = Math.min(parseInt(String(req.query?.limit ?? 20)), 100);
  const activity = await prisma.activityLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  res.json({ activity });
});

export default router;
