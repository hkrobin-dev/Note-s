import { Router } from "express";
import { body, query, param, validationResult } from "express-validator";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

const timeEntrySchema = z.object({
  taskId: z.string().optional().nullable(),
  routineId: z.string().optional().nullable(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional().nullable(),
  durationMins: z.number().int().positive().optional().nullable(),
  note: z.string().optional().nullable(),
});

const updateTimeEntrySchema = timeEntrySchema.partial();

// List time entries (optionally filtered by date)
router.get("/", query("date").optional().isISO8601(), async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const where: any = { userId };
  if (req.query?.date) {
    const d = new Date(req.query.date as string);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    where.startAt = { gte: start, lte: end };
  }
  const entries = await prisma.timeEntry.findMany({
    where,
    orderBy: { startAt: "desc" },
    include: { task: true, routine: true },
  });
  res.json({ timeEntries: entries });
});

// Get one time entry
router.get("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const entry = await prisma.timeEntry.findFirst({ where: { id: req.params.id, userId }, include: { task: true, routine: true } });
  if (!entry) return res.status(404).json({ error: "Time entry not found" });
  res.json({ timeEntry: entry });
});

// Create time entry
router.post("/", body("startAt").notEmpty(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const parsed = timeEntrySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const entry = await prisma.timeEntry.create({ data: { ...parsed.data, userId }, include: { task: true, routine: true } });
  res.status(201).json({ timeEntry: entry });
});

// Update time entry
router.patch("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.timeEntry.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Time entry not found" });
  const parsed = updateTimeEntrySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const entry = await prisma.timeEntry.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: { task: true, routine: true },
  });
  res.json({ timeEntry: entry });
});

// Delete time entry
router.delete("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.timeEntry.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Time entry not found" });
  await prisma.timeEntry.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// Daily summary: total minutes per day grouped
router.get("/summary/daily", query("from").optional().isISO8601(), query("to").optional().isISO8601(), async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const where: any = { userId, endAt: { not: null } };
  if (req.query?.from) where.startAt = { ...where.startAt, gte: new Date(req.query.from as string) };
  if (req.query?.to) where.startAt = { ...where.startAt, lte: new Date(req.query.to as string) };
  const entries = await prisma.timeEntry.findMany({ where, select: { startAt: true, durationMins: true } });
  const byDay: Record<string, number> = {};
  for (const e of entries) {
    const day = e.startAt.toISOString().slice(0, 10);
    byDay[day] = (byDay[day] || 0) + (e.durationMins || 0);
  }
  res.json({ daily: Object.entries(byDay).map(([date, mins]) => ({ date, mins })) });
});

export default router;
