import { Router } from "../lib/async-router";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

router.get("/", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const since = new Date(today);
  since.setDate(since.getDate() - 29);

  const habits = await prisma.habit.findMany({
    where: { userId, active: true },
    include: { logs: { where: { date: { gte: since } }, orderBy: { date: "desc" } } },
    orderBy: { createdAt: "desc" },
  });

  const withToday = habits.map((h) => ({
    ...h,
    checkedInToday: h.logs.some((l) => +new Date(l.date) >= +today),
  }));

  res.json({ habits: withToday });
});

router.post("/", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const parsed = z.object({ title: z.string().min(1).max(200) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const habit = await prisma.habit.create({
    data: { title: parsed.data.title, userId },
  });
  res.status(201).json({ habit });
});

router.post("/:id/checkin", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const habitId = req.params.id;
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) return res.status(404).json({ error: "Habit not found" });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  try {
    const log = await prisma.habitLog.create({
      data: { habitId, userId, date: today },
    });
    res.status(201).json({ log });
  } catch (e: any) {
    if (e?.code === "P2002") return res.status(409).json({ error: "Already checked in today" });
    throw e;
  }
});

router.delete("/:id/checkin", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const habitId = req.params.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.habitLog.deleteMany({ where: { habitId, userId, date: today } });
  res.json({ ok: true });
});

router.delete("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const habit = await prisma.habit.findFirst({ where: { id: req.params.id, userId } });
  if (!habit) return res.status(404).json({ error: "Habit not found" });
  await prisma.habit.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
