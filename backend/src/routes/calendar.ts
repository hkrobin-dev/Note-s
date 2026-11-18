import { Router } from "../lib/async-router";
import { body, query, validationResult } from "express-validator";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

const recurrenceSchema = z.object({
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY", "CUSTOM"]),
  interval: z.number().int().min(1).max(365).optional(),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  until: z.string().datetime().optional().nullable(),
  maxOccurrences: z.number().int().min(1).max(1000).optional().nullable(),
});

const eventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  allDay: z.boolean().optional(),
  eventType: z.string().optional(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().optional(),
  projectId: z.string().optional().nullable(),
  taskId: z.string().optional().nullable(),
  recurrence: recurrenceSchema.optional().nullable(),
});

function recurrenceData(rec: z.infer<typeof recurrenceSchema>) {
  return {
    frequency: rec.frequency,
    interval: rec.interval ?? 1,
    weekdays: rec.weekdays ?? [],
    dayOfMonth: rec.dayOfMonth ?? null,
    until: rec.until ? new Date(rec.until) : null,
    maxOccurrences: rec.maxOccurrences ?? null,
  };
}

router.get("/", query("start").optional().isISO8601(), query("end").optional().isISO8601(), async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const where: any = { userId };
  if (req.query?.start || req.query?.end) {
    where.startAt = {};
    if (req.query?.start) where.startAt.gte = new Date(req.query?.start as string);
    if (req.query?.end) where.startAt.lte = new Date(req.query?.end as string);
  }
  const events = await prisma.calendarEvent.findMany({
    where,
    include: { reminders: true, recurrence: true },
    orderBy: { startAt: "asc" },
  });
  res.json({ events });
});

router.get("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const event = await prisma.calendarEvent.findFirst({
    where: { id: req.params.id, userId },
    include: { reminders: true, recurrence: true },
  });
  if (!event) return res.status(404).json({ error: "Event not found" });
  res.json({ event });
});

router.post("/", body("title").notEmpty(), body("startAt").isISO8601(), body("endAt").isISO8601(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { recurrence, ...data } = parsed.data;
  const event = await prisma.calendarEvent.create({
    data: {
      ...data,
      userId,
      ...(recurrence ? { recurrence: { create: recurrenceData(recurrence) } } : {}),
    },
    include: { recurrence: true },
  });
  res.status(201).json({ event });
});

router.patch("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.calendarEvent.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Event not found" });
  const parsed = eventSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { recurrence, ...data } = parsed.data;
  await prisma.calendarEvent.update({ where: { id: req.params.id }, data });

  if (recurrence === null) {
    await prisma.recurrenceRule.deleteMany({ where: { eventId: existing.id } });
  } else if (recurrence) {
    const values = recurrenceData(recurrence);
    await prisma.recurrenceRule.upsert({
      where: { eventId: existing.id },
      create: { eventId: existing.id, ...values },
      update: values,
    });
  }

  const event = await prisma.calendarEvent.findUnique({
    where: { id: existing.id },
    include: { reminders: true, recurrence: true },
  });
  res.json({ event });
});

router.delete("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.calendarEvent.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Event not found" });
  await prisma.calendarEvent.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
