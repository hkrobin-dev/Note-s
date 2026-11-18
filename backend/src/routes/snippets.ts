import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

const snippetSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  language: z.string().max(40).optional(),
  code: z.string(),
  tags: z.array(z.string().max(40)).optional(),
  favorite: z.boolean().optional(),
});

router.get("/", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const snippets = await prisma.snippet.findMany({
    where: {
      userId,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ favorite: "desc" }, { updatedAt: "desc" }],
  });
  res.json({ snippets });
});

router.post("/", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const parsed = snippetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const snippet = await prisma.snippet.create({ data: { ...parsed.data, userId } });
  res.status(201).json({ snippet });
});

router.patch("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.snippet.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Snippet not found" });
  const parsed = snippetSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const snippet = await prisma.snippet.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ snippet });
});

router.delete("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.snippet.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Snippet not found" });
  await prisma.snippet.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
