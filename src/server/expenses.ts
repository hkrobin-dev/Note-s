import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/api-response";
import type { CreateExpenseInput, ExpenseQueryInput, UpdateExpenseInput } from "@/lib/validation/expense";
import type { PaymentMethod } from "@/types";

const DEFAULT_LIMIT = 100;

export const expenseInclude = {
  category: { select: { id: true, name: true, color: true, icon: true } },
  project: { select: { id: true, name: true, accentColor: true } },
  taggedWith: { include: { tag: { select: { id: true, name: true, color: true } } } },
} satisfies Prisma.ExpenseInclude;

export type ExpenseWithRelations = Prisma.ExpenseGetPayload<{ include: typeof expenseInclude }>;

export async function listExpenses(query: ExpenseQueryInput) {
  const where: Prisma.ExpenseWhereInput = {};

  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.projectId) where.projectId = query.projectId;
  if (query.paymentMethod) where.paymentMethod = query.paymentMethod as PaymentMethod;
  if (query.from || query.to) {
    where.expenseDate = {};
    if (query.from) where.expenseDate.gte = query.from;
    if (query.to) where.expenseDate.lte = query.to;
  }
  if (query.q) {
    where.OR = [
      { description: { contains: query.q, mode: "insensitive" } },
      { vendor: { contains: query.q, mode: "insensitive" } },
    ];
  }

  return prisma.expense.findMany({
    where,
    include: expenseInclude,
    orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
    take: query.limit ?? DEFAULT_LIMIT,
  });
}

export async function getExpense(id: string) {
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: expenseInclude,
  });
  if (!expense) throw new NotFoundError("Expense not found");
  return expense;
}

export async function createExpense(input: CreateExpenseInput) {
  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        ...input,
        amount: new Prisma.Decimal(input.amount),
      },
      include: expenseInclude,
    });

    await tx.activityLog.create({
      data: {
        entityType: "EXPENSE",
        entityId: expense.id,
        action: "CREATED",
        detail: { amount: input.amount, description: expense.description },
      },
    });

    return expense;
  });
}

export async function updateExpense(id: string, input: UpdateExpenseInput) {
  const existing = await prisma.expense.findUnique({
    where: { id },
    select: { id: true, description: true, amount: true },
  });
  if (!existing) throw new NotFoundError("Expense not found");

  return prisma.$transaction(async (tx) => {
    const data: Prisma.ExpenseUpdateInput = { ...input };
    if (input.amount !== undefined) {
      data.amount = new Prisma.Decimal(input.amount);
    }

    const expense = await tx.expense.update({
      where: { id },
      data,
      include: expenseInclude,
    });

    await tx.activityLog.create({
      data: {
        entityType: "EXPENSE",
        entityId: expense.id,
        action: "UPDATED",
        detail: { description: expense.description },
      },
    });

    return expense;
  });
}

export async function deleteExpense(id: string) {
  const existing = await prisma.expense.findUnique({
    where: { id },
    select: { id: true, description: true },
  });
  if (!existing) throw new NotFoundError("Expense not found");

  return prisma.$transaction(async (tx) => {
    await tx.expense.delete({ where: { id } });
    await tx.activityLog.create({
      data: {
        entityType: "EXPENSE",
        entityId: existing.id,
        action: "DELETED",
        detail: { description: existing.description },
      },
    });
    return existing;
  });
}
