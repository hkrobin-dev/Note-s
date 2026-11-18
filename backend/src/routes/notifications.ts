import { Router } from "../lib/async-router";
import { query, validationResult } from "express-validator";
import { prisma } from "../lib/prisma";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

router.get("/", query("unreadOnly").optional().isBoolean(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const where: any = { userId };
  if (req.query?.unreadOnly === "true") where.read = false;

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unreadCount = await prisma.notification.count({ where: { userId, read: false } });
  res.json({ notifications, unreadCount });
});

router.patch("/:id/read", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  await prisma.notification.updateMany({ where: { id: req.params.id, userId }, data: { read: true, readAt: new Date() } });
  res.json({ ok: true });
});

router.patch("/read-all", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true, readAt: new Date() } });
  res.json({ ok: true });
});

router.delete("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.notification.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Notification not found" });
  await prisma.notification.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
