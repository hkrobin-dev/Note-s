import { Router } from "../lib/async-router";
import { body, query, param, validationResult } from "express-validator";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

const routineSchema = z.object({
  title: z.string().min(1).max(200),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:mm"),
  daysOfWeek: z.array(z.number().int().min(1).max(7)).default([]),
  taskId: z.string().optional().nullable(),
  reminderOffsetMins: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

// Written out instead of `.partial()` so schema defaults do not overwrite
// existing values when a PATCH only sends one field.
const updateRoutineSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:mm").optional(),
  daysOfWeek: z.array(z.number().int().min(1).max(7)).optional(),
  taskId: z.string().optional().nullable(),
  reminderOffsetMins: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

// List routines
router.get("/", query("active").optional().isBoolean(), async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const where: any = { userId };
  if (req.query?.active !== undefined) where.active = req.query.active === "true";
  const routines = await prisma.routine.findMany({
    where,
    orderBy: [{ timeOfDay: "asc" }, { title: "asc" }],
    include: { task: true },
  });
  res.json({ routines });
});

// Get one routine
router.get("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const routine = await prisma.routine.findFirst({ where: { id: req.params.id, userId }, include: { task: true } });
  if (!routine) return res.status(404).json({ error: "Routine not found" });
  res.json({ routine });
});

// Create routine
router.post("/", body("title").notEmpty(), body("timeOfDay").notEmpty(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const parsed = routineSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const routine = await prisma.routine.create({ data: { ...parsed.data, userId }, include: { task: true } });
  res.status(201).json({ routine });
});

// Update routine
router.patch("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.routine.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Routine not found" });
  const parsed = updateRoutineSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const routine = await prisma.routine.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: { task: true },
  });
  res.json({ routine });
});

// Delete routine
router.delete("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.routine.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Routine not found" });
  await prisma.routine.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
