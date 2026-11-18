import { z } from "zod";

export const PAYMENT_METHOD_VALUES = ["CASH", "CARD", "BANK_TRANSFER", "MOBILE_WALLET", "OTHER"] as const;

export const paymentMethodSchema = z.enum(PAYMENT_METHOD_VALUES);

const expenseFields = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  description: z.string().trim().max(5000).nullish(),
  expenseDate: z.coerce.date(),
  paymentMethod: paymentMethodSchema,
  vendor: z.string().trim().max(200).nullish(),
  categoryId: z.string().min(1, "Category is required"),
  projectId: z.string().min(1).nullish(),
});

export const createExpenseSchema = expenseFields.extend({
  paymentMethod: paymentMethodSchema.default("CASH"),
  expenseDate: z.coerce.date().default(() => new Date()),
});

export const updateExpenseSchema = expenseFields.partial();

export const expenseQuerySchema = z.object({
  categoryId: z.string().optional(),
  projectId: z.string().optional(),
  paymentMethod: z.string().optional(),
  from: z.coerce.date().nullish(),
  to: z.coerce.date().nullish(),
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ExpenseQueryInput = z.infer<typeof expenseQuerySchema>;
