import { Router } from "../lib/async-router";
import { body, query, validationResult } from "express-validator";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

const expenseSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  expenseDate: z.string().datetime(),
  description: z.string().optional().nullable(),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "MOBILE_WALLET", "OTHER"]).optional(),
  vendor: z.string().optional().nullable(),
  categoryId: z.string(),
  projectId: z.string().optional().nullable(),
});

router.get("/", query("start").optional().isISO8601(), query("end").optional().isISO8601(), async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const where: any = { userId };
  if (req.query?.start || req.query?.end) {
    where.expenseDate = {};
    if (req.query?.start) where.expenseDate.gte = new Date(req.query?.start as string);
    if (req.query?.end) where.expenseDate.lte = new Date(req.query?.end as string);
  }
  const expenses = await prisma.expense.findMany({
    where,
    include: { category: true },
    orderBy: { expenseDate: "desc" },
  });
  res.json({ expenses });
});

router.post("/", body("amount").notEmpty(), body("categoryId").notEmpty(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const parsed = expenseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const expense = await prisma.expense.create({
    data: { ...parsed.data, amount: parseFloat(parsed.data.amount), userId },
    include: { category: true },
  });
  res.status(201).json({ expense });
});

router.patch("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.expense.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Expense not found" });
  const parsed = expenseSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data: any = { ...parsed.data };
  if (data.amount) data.amount = parseFloat(data.amount);
  const expense = await prisma.expense.update({ where: { id: req.params.id }, data, include: { category: true } });
  res.json({ expense });
});

router.delete("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.expense.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Expense not found" });
  await prisma.expense.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// categories
router.get("/categories", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const categories = await prisma.expenseCategory.findMany({ where: { userId, archived: false }, orderBy: { order: "asc" } });
  res.json({ categories });
});

router.post("/categories", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const parsed = z
    .object({ name: z.string().min(1).max(60), color: z.string().max(20).optional(), icon: z.string().max(20).optional() })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.expenseCategory.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    if (existing.userId !== userId) return res.status(409).json({ error: "Category name already in use" });
    return res.json({ category: existing });
  }

  const category = await prisma.expenseCategory.create({
    data: { ...parsed.data, userId },
  });
  res.status(201).json({ category });
});

// ---------------------------------------------------------------------------
// Recurring expenses
// ---------------------------------------------------------------------------

const recurringSchema = z.object({
  name: z.string().min(1).max(120),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY", "CUSTOM"]),
  categoryId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  nextExpectedAt: z.string().datetime().optional(),
  active: z.boolean().optional(),
  autoCreate: z.boolean().optional(),
});

function advanceDate(date: Date, frequency: string, interval = 1) {
  const d = new Date(date);
  switch (frequency) {
    case "DAILY":
      d.setDate(d.getDate() + interval);
      break;
    case "WEEKLY":
      d.setDate(d.getDate() + 7 * interval);
      break;
    case "MONTHLY":
      d.setMonth(d.getMonth() + interval);
      break;
    case "YEARLY":
      d.setFullYear(d.getFullYear() + interval);
      break;
    default:
      d.setDate(d.getDate() + 7 * interval);
  }
  return d;
}

// Materialise any due, auto-create recurring expenses before listing them.
async function runDueRecurring(userId: string) {
  const due = await prisma.recurringExpense.findMany({
    where: { userId, active: true, autoCreate: true, nextExpectedAt: { lte: new Date() } },
    orderBy: { nextExpectedAt: "asc" },
  });

  for (const rec of due) {
    let next = rec.nextExpectedAt;
    let guard = 0;
    while (next <= new Date() && rec.active && guard < 12) {
      await prisma.expense.create({
        data: {
          userId,
          amount: rec.amount,
          expenseDate: next,
          description: rec.name,
          paymentMethod: "OTHER",
          categoryId: rec.categoryId,
        },
      });
      next = advanceDate(next, rec.frequency);
      guard += 1;
      if (rec.endDate && next > rec.endDate) break;
    }
    const ended = !!rec.endDate && next > rec.endDate;
    await prisma.recurringExpense.update({
      where: { id: rec.id },
      data: { nextExpectedAt: next, active: ended ? false : rec.active },
    });
  }
}

router.get("/recurring", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  await runDueRecurring(userId);
  const recurring = await prisma.recurringExpense.findMany({
    where: { userId },
    include: { category: true },
    orderBy: [{ active: "desc" }, { nextExpectedAt: "asc" }],
  });
  res.json({ recurring });
});

router.post("/recurring", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const parsed = recurringSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const category = await prisma.expenseCategory.findFirst({ where: { id: parsed.data.categoryId, userId } });
  if (!category) return res.status(400).json({ error: "Unknown category" });

  const { amount, startDate, endDate, nextExpectedAt, ...rest } = parsed.data;
  const recurring = await prisma.recurringExpense.create({
    data: {
      ...rest,
      userId,
      amount: parseFloat(amount),
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      nextExpectedAt: new Date(nextExpectedAt ?? startDate),
    },
    include: { category: true },
  });
  res.status(201).json({ recurring });
});

router.patch("/recurring/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.recurringExpense.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Recurring expense not found" });

  const parsed = recurringSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { amount, startDate, endDate, nextExpectedAt, categoryId, ...rest } = parsed.data;
  if (categoryId) {
    const category = await prisma.expenseCategory.findFirst({ where: { id: categoryId, userId } });
    if (!category) return res.status(400).json({ error: "Unknown category" });
  }

  const recurring = await prisma.recurringExpense.update({
    where: { id: existing.id },
    data: {
      ...rest,
      ...(categoryId ? { categoryId } : {}),
      ...(amount ? { amount: parseFloat(amount) } : {}),
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      ...(nextExpectedAt ? { nextExpectedAt: new Date(nextExpectedAt) } : {}),
      ...(rest.active === false ? { pausedAt: new Date() } : rest.active === true ? { pausedAt: null } : {}),
    },
    include: { category: true },
  });
  res.json({ recurring });
});

router.delete("/recurring/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.recurringExpense.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Recurring expense not found" });
  await prisma.recurringExpense.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

router.post("/recurring/:id/log", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const rec = await prisma.recurringExpense.findFirst({ where: { id: req.params.id, userId } });
  if (!rec) return res.status(404).json({ error: "Recurring expense not found" });

  const expense = await prisma.expense.create({
    data: {
      userId,
      amount: rec.amount,
      expenseDate: rec.nextExpectedAt,
      description: rec.name,
      paymentMethod: "OTHER",
      categoryId: rec.categoryId,
    },
    include: { category: true },
  });

  const next = advanceDate(rec.nextExpectedAt, rec.frequency);
  const ended = !!rec.endDate && next > rec.endDate;
  const recurring = await prisma.recurringExpense.update({
    where: { id: rec.id },
    data: { nextExpectedAt: next, active: ended ? false : rec.active },
    include: { category: true },
  });
  res.status(201).json({ expense, recurring });
});

export default router;
