import { Router } from "../lib/async-router";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

const goalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(40).optional(),
  targetValue: z.number().nonnegative().optional(),
  currentValue: z.number().nonnegative().optional(),
  unit: z.string().max(20).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.enum(["ACTIVE", "COMPLETED", "PAUSED", "ARCHIVED"]).optional(),
});

router.get("/", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const goals = await prisma.goal.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });
  res.json({ goals });
});

router.post("/", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const parsed = goalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { dueDate, ...rest } = parsed.data;
  const goal = await prisma.goal.create({
    data: {
      ...rest,
      dueDate: dueDate ? new Date(dueDate) : null,
      userId,
    },
  });
  res.status(201).json({ goal });
});

router.patch("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.goal.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Goal not found" });

  const parsed = goalSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { dueDate, ...rest } = parsed.data;
  const goal = await prisma.goal.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
    },
  });
  res.json({ goal });
});

router.delete("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.goal.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Goal not found" });
  await prisma.goal.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
