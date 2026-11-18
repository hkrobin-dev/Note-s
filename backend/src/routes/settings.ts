import { Router } from "../lib/async-router";
import { body, validationResult } from "express-validator";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { sendEmail } from "../lib/email";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

const settingSchema = z.object({
  theme: z.enum(["light", "dark"]).optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  notificationsEnabled: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
});

router.get("/", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  let settings = await prisma.userSetting.findUnique({ where: { userId } });
  if (!settings) {
    settings = await prisma.userSetting.create({ data: { userId } });
  }
  res.json({ settings });
});

router.get("/export", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;

  const [
    settings,
    tasks,
    projects,
    events,
    pages,
    goals,
    habits,
    timeEntries,
    expenses,
    incomes,
    budgets,
    routines,
    files,
    snippets,
    bookmarks,
    meetings,
    reminders,
    notifications,
  ] = await Promise.all([
    prisma.userSetting.findUnique({ where: { userId } }),
    prisma.task.findMany({ where: { userId } }),
    prisma.project.findMany({ where: { userId } }),
    prisma.calendarEvent.findMany({ where: { userId } }),
    prisma.page.findMany({ where: { userId } }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.habit.findMany({ where: { userId }, include: { logs: true } }),
    prisma.timeEntry.findMany({ where: { userId } }),
    prisma.expense.findMany({ where: { userId } }),
    prisma.incomeRecord.findMany({ where: { userId } }),
    prisma.budget.findMany({ where: { userId } }),
    prisma.routine.findMany({ where: { userId } }),
    prisma.storedFile.findMany({
      where: { userId },
      select: { id: true, filename: true, mimeType: true, byteSize: true, createdAt: true, deletedAt: true },
    }),
    prisma.snippet.findMany({ where: { userId } }),
    prisma.bookmark.findMany({ where: { userId } }),
    prisma.meeting.findMany({ where: { userId } }),
    prisma.reminder.findMany({ where: { userId } }),
    prisma.notification.findMany({ where: { userId } }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user: { id: userId },
    counts: {
      tasks: tasks.length,
      projects: projects.length,
      calendarEvents: events.length,
      pages: pages.length,
      goals: goals.length,
      habits: habits.length,
      timeEntries: timeEntries.length,
      expenses: expenses.length,
      incomes: incomes.length,
      budgets: budgets.length,
      routines: routines.length,
      files: files.length,
      snippets: snippets.length,
      bookmarks: bookmarks.length,
      meetings: meetings.length,
    },
    data: {
      settings,
      tasks,
      projects,
      calendarEvents: events,
      pages,
      goals,
      habits,
      timeEntries,
      expenses,
      incomes,
      budgets,
      routines,
      files,
      snippets,
      bookmarks,
      meetings,
      reminders,
      notifications,
    },
  };

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="my-life-os-export-${stamp}.json"`);
  res.send(JSON.stringify(payload, null, 2));
});

router.patch("/", body("theme").optional().isIn(["light", "dark"]), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const parsed = settingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const settings = await prisma.userSetting.upsert({
    where: { userId },
    update: parsed.data,
    create: { userId, ...parsed.data },
  });
  res.json({ settings });
});

router.post("/test-email", body("to").isEmail(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const result = await sendEmail({ to: req.body.to, subject: "My Life OS — Email Test", text: "Your email notifications are working!", html: "<h2>My Life OS — Email Test</h2><p>Your email notifications are working!</p>" });
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
