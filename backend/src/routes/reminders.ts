import { Router } from "../lib/async-router";
import { body, query, validationResult } from "express-validator";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { sendReminderEmail } from "../lib/email";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

const reminderSchema = z.object({
  scheduledAt: z.string().datetime(),
  message: z.string().min(1).max(500),
  channel: z.enum(["APP", "BROWSER", "EMAIL"]).optional(),
  status: z.enum(["PENDING", "SENT", "FAILED", "CANCELLED"]).optional(),
  taskId: z.string().optional().nullable(),
  eventId: z.string().optional().nullable(),
});

router.get("/", query("status").optional().isIn(["PENDING", "SENT", "FAILED", "CANCELLED"]), async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const where: any = { userId };
  if (req.query?.status) where.status = req.query?.status;
  const reminders = await prisma.reminder.findMany({
    where,
    orderBy: { scheduledAt: "asc" },
    include: { task: true, event: true },
  });
  res.json({ reminders });
});

router.post("/", body("scheduledAt").isISO8601(), body("message").notEmpty(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const parsed = reminderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const reminder = await prisma.reminder.create({
    data: { ...parsed.data, userId, status: "PENDING" },
    include: { task: true, event: true },
  });

  // create in-app notification
  await prisma.notification.create({
    data: {
      userId,
      type: "REMINDER",
      title: "Reminder scheduled",
      body: reminder.message,
      link: `/reminders`,
    },
  });

  res.status(201).json({ reminder });
});

router.patch("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.reminder.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Reminder not found" });

  const parsed = reminderSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const reminder = await prisma.reminder.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      ...(parsed.data.status === "SENT" ? { sentAt: new Date(), completedAt: new Date() } : {}),
    },
  });
  res.json({ reminder });
});

router.delete("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.reminder.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Reminder not found" });
  await prisma.reminder.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
