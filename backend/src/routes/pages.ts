import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

const pageSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.any().optional().nullable(),
  icon: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  favorite: z.boolean().optional(),
  order: z.number().int().optional(),
});

router.get("/", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const pages = await prisma.page.findMany({
    where: { userId, archivedAt: null },
    orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
  });
  res.json({ pages });
});

router.get("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const page = await prisma.page.findFirst({ where: { id: req.params.id, userId } });
  if (!page) return res.status(404).json({ error: "Page not found" });
  res.json({ page });
});

router.post("/", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const parsed = pageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const page = await prisma.page.create({
    data: { ...parsed.data, title: parsed.data.title, userId },
  });
  res.status(201).json({ page });
});

/** True when making `parentId` the parent of `pageId` would create a loop. */
async function createsCycle(userId: string, pageId: string, parentId: string) {
  let cursor: string | null = parentId;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === pageId) return true;
    if (seen.has(cursor)) return true; // pre-existing loop, refuse to extend it
    seen.add(cursor);
    const parent: { parentId: string | null } | null = await prisma.page.findFirst({
      where: { id: cursor, userId },
      select: { parentId: true },
    });
    cursor = parent?.parentId ?? null;
  }
  return false;
}

router.patch("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.page.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Page not found" });

  const parsed = pageSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const nextParentId = parsed.data.parentId;
  if (nextParentId) {
    if (nextParentId === existing.id) return res.status(400).json({ error: "A page cannot be its own parent" });
    const parent = await prisma.page.findFirst({ where: { id: nextParentId, userId } });
    if (!parent) return res.status(400).json({ error: "Unknown parent page" });
    if (await createsCycle(userId, existing.id, nextParentId)) {
      return res.status(400).json({ error: "A page cannot be moved inside one of its descendants" });
    }
  }

  const page = await prisma.page.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ page });
});

router.delete("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.page.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Page not found" });

  // Archive the page but move its children up one level so they stay reachable.
  await prisma.$transaction([
    prisma.page.updateMany({
      where: { parentId: existing.id, userId },
      data: { parentId: existing.parentId ?? null },
    }),
    prisma.page.update({ where: { id: existing.id }, data: { archivedAt: new Date() } }),
  ]);
  res.json({ ok: true });
});

export default router;
