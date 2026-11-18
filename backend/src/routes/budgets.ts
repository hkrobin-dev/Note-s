import { Router } from "../lib/async-router";
import { body, validationResult } from "express-validator";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

const budgetSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  month: z.string().datetime(), // first day of month, ISO
  categoryId: z.string().min(1).optional().nullable(),
});

router.get("/", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const budgets = await prisma.budget.findMany({
    where: { userId },
    include: { category: true },
    orderBy: [{ month: "desc" }],
  });
  res.json({ budgets });
});

router.post("/", body("amount").notEmpty(), body("month").notEmpty(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const parsed = budgetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const categoryId = parsed.data.categoryId ?? null;
  if (categoryId) {
    const category = await prisma.expenseCategory.findFirst({ where: { id: categoryId, userId } });
    if (!category) return res.status(400).json({ error: "Unknown category" });
  }

  const monthDate = new Date(parsed.data.month);
  const normalized = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);

  const existing = await prisma.budget.findFirst({
    where: { userId, month: normalized, categoryId },
  });

  const budget = existing
    ? await prisma.budget.update({
        where: { id: existing.id },
        data: { amount: parseFloat(parsed.data.amount) },
        include: { category: true },
      })
    : await prisma.budget.create({
        data: { amount: parseFloat(parsed.data.amount), month: normalized, userId, categoryId },
        include: { category: true },
      });
  res.status(201).json({ budget });
});

router.delete("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.budget.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Budget not found" });
  await prisma.budget.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
