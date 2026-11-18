import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

const bookmarkSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url().max(2000),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(40).optional(),
  tags: z.array(z.string().max(40)).optional(),
  favorite: z.boolean().optional(),
});

router.get("/", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const bookmarks = await prisma.bookmark.findMany({
    where: {
      userId,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { url: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ favorite: "desc" }, { updatedAt: "desc" }],
  });
  res.json({ bookmarks });
});

router.post("/", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const parsed = bookmarkSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const bookmark = await prisma.bookmark.create({ data: { ...parsed.data, userId } });
  res.status(201).json({ bookmark });
});

router.patch("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.bookmark.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Bookmark not found" });
  const parsed = bookmarkSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const bookmark = await prisma.bookmark.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ bookmark });
});

router.delete("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.bookmark.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Bookmark not found" });
  await prisma.bookmark.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
