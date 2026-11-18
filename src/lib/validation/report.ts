import { z } from "zod";

export const reportQuerySchema = z.object({
  month: z.coerce.date().nullish(),
  categoryId: z.string().optional(),
});

export type ReportQueryInput = z.infer<typeof reportQuerySchema>;

export type BudgetVsActual = {
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  budgeted: number;
  spent: number;
  remaining: number;
};

export type ReportSummary = {
  month: string;
  budgeted: number;
  spent: number;
  income: number;
  remaining: number;
};
