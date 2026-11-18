import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

const projectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  startDate: z.string().datetime().optional().nullable(),
  deadline: z.string().datetime().optional().nullable(),
  accentColor: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
});

router.get("/", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const projects = await prisma.project.findMany({
    where: { userId },
    include: {
      _count: { select: { tasks: true } },
      tasks: { select: { id: true, title: true, status: true, dueDate: true }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
  });
  res.json({ projects });
});

router.get("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId },
    include: { tasks: true },
  });
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json({ project });
});

router.post("/", body("name").notEmpty(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const project = await prisma.project.create({ data: { ...parsed.data, userId } });
  res.status(201).json({ project });
});

router.patch("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.project.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Project not found" });

  const parsed = projectSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json({ project });
});

router.delete("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.project.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Project not found" });
  await prisma.project.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
