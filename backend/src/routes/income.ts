import { Router } from "../lib/async-router";
import { body, query, validationResult } from "express-validator";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

const incomeSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  incomeDate: z.string().datetime(),
  source: z.string().min(1).max(120),
  // Stored as `note` in the database; exposed as `description` for the API/UI.
  description: z.string().max(2000).optional().nullable(),
});

function present<T extends { note?: string | null }>(income: T) {
  return { ...income, description: income.note ?? null };
}

router.get("/", query("start").optional().isISO8601(), query("end").optional().isISO8601(), async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const where: any = { userId };
  if (req.query?.start || req.query?.end) {
    where.incomeDate = {};
    if (req.query?.start) where.incomeDate.gte = new Date(req.query?.start as string);
    if (req.query?.end) where.incomeDate.lte = new Date(req.query?.end as string);
  }
  const rows = await prisma.incomeRecord.findMany({
    where,
    orderBy: { incomeDate: "desc" },
  });
  res.json({ incomes: rows.map(present) });
});

router.post("/", body("amount").notEmpty(), body("source").notEmpty(), body("incomeDate").notEmpty(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const parsed = incomeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const { amount, incomeDate, source, description } = parsed.data;
  const income = await prisma.incomeRecord.create({
    data: {
      amount: parseFloat(amount),
      incomeDate: new Date(incomeDate),
      source,
      note: description ?? null,
      userId,
    },
  });
  res.status(201).json({ income: present(income) });
});

router.patch("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.incomeRecord.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Income not found" });
  const parsed = incomeSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { amount, incomeDate, source, description } = parsed.data;
  const income = await prisma.incomeRecord.update({
    where: { id: existing.id },
    data: {
      ...(amount !== undefined ? { amount: parseFloat(amount) } : {}),
      ...(incomeDate !== undefined ? { incomeDate: new Date(incomeDate) } : {}),
      ...(source !== undefined ? { source } : {}),
      ...(description !== undefined ? { note: description || null } : {}),
    },
  });
  res.json({ income: present(income) });
});

router.delete("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.incomeRecord.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Income not found" });
  await prisma.incomeRecord.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
