import { Router } from "express";
import { query, body, param, validationResult } from "express-validator";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  startDate: z.string().datetime().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  estimatedMins: z.number().int().positive().optional().nullable(),
  projectId: z.string().optional().nullable(),
  parentTaskId: z.string().optional().nullable(),
});

const updateTaskSchema = taskSchema.partial();

// List
router.get(
  "/",
  query("status").optional().isIn(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]),
  query("projectId").optional().isString(),
  query("dueDate").optional().isISO8601(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const userId = (req as any).user?.id ?? DEMO_USER_ID;
    const where: any = { userId };
    if (req.query?.status) where.status = req.query?.status;
    if (req.query?.projectId) where.projectId = req.query?.projectId;
    if (req.query?.dueDate) {
      const d = new Date(req.query?.dueDate as string);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      where.dueDate = { gte: start, lte: end };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: { project: true, subtasks: true, reminders: true, _count: { select: { comments: true } } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
    res.json({ tasks });
  },
);

// Get one
router.get("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const task = await prisma.task.findFirst({ where: { id: req.params.id, userId }, include: { project: true, subtasks: true, reminders: true, _count: { select: { comments: true } } } });
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json({ task });
});

// Comments
router.get("/:id/comments", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const task = await prisma.task.findFirst({ where: { id: req.params.id, userId }, select: { id: true } });
  if (!task) return res.status(404).json({ error: "Task not found" });

  const comments = await prisma.taskComment.findMany({
    where: { taskId: req.params.id },
    orderBy: { createdAt: "asc" },
  });
  res.json({ comments });
});

router.post("/:id/comments", body("body").trim().notEmpty().isLength({ max: 5000 }), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const taskId = req.params?.id ?? "";
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const task = await prisma.task.findFirst({ where: { id: taskId, userId }, select: { id: true } });
  if (!task) return res.status(404).json({ error: "Task not found" });

  const comment = await prisma.taskComment.create({
    data: { taskId, userId, body: String(req.body.body).trim() },
  });
  res.status(201).json({ comment });
});

router.delete("/:id/comments/:commentId", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const comment = await prisma.taskComment.findFirst({
    where: { id: req.params.commentId, taskId: req.params.id },
  });
  if (!comment) return res.status(404).json({ error: "Comment not found" });
  // Only the author can delete their comment.
  if (comment.userId !== userId) return res.status(403).json({ error: "Not allowed" });

  await prisma.taskComment.delete({ where: { id: comment.id } });
  res.json({ ok: true });
});

// Create
router.post("/", body("title").notEmpty(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const task = await prisma.task.create({
    data: { ...parsed.data, userId },
    include: { project: true },
  });
  res.status(201).json({ task });
});

// Update
router.patch("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.task.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Task not found" });

  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      ...(parsed.data.status === "DONE"
        ? { completedAt: new Date() }
        : parsed.data.status
          ? { completedAt: null }
          : {}),
    },
    include: { project: true },
  });
  res.json({ task });
});

// Delete
router.delete("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.task.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Task not found" });
  await prisma.task.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
