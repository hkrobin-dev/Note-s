import { Router } from "../lib/async-router";
import { body, param, validationResult } from "express-validator";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

const noteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.any().optional(),
  icon: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  favorite: z.boolean().optional(),
  projectId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

router.get("/", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const notes = await prisma.page.findMany({
    where: { userId, archivedAt: null },
    orderBy: { updatedAt: "desc" },
  });
  res.json({ notes });
});

router.get("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const note = await prisma.page.findFirst({ where: { id: req.params.id, userId } });
  if (!note) return res.status(404).json({ error: "Note not found" });
  res.json({ note });
});

router.post("/", body("title").notEmpty(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const note = await prisma.page.create({ data: { ...parsed.data, userId } });
  res.status(201).json({ note });
});

router.patch("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.page.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Note not found" });

  const parsed = noteSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const note = await prisma.page.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ note });
});

router.delete("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.page.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Note not found" });
  await prisma.page.update({ where: { id: req.params.id }, data: { archivedAt: new Date() } });
  res.json({ ok: true });
});

export default router;
