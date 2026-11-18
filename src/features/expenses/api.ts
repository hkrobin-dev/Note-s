import type { ExpenseWithRelations } from "@/server/expenses";

export type ExpenseDTO = Omit<
  ExpenseWithRelations,
  "expenseDate" | "createdAt" | "updatedAt" | "amount"
> & {
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
  amount: string;
};

export type ExpensePayload = {
  amount?: string | number | null;
  description?: string | null;
  expenseDate?: string | null;
  paymentMethod?: string;
  vendor?: string | null;
  categoryId?: string | null;
  projectId?: string | null;
};

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export function expenseQueryString(params: {
  categoryId?: string;
  projectId?: string;
  paymentMethod?: string;
  from?: string;
  to?: string;
  q?: string;
  limit?: number;
}): string {
  const searchParams = new URLSearchParams();
  if (params.categoryId) searchParams.set("categoryId", params.categoryId);
  if (params.projectId) searchParams.set("projectId", params.projectId);
  if (params.paymentMethod) searchParams.set("paymentMethod", params.paymentMethod);
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  if (params.q?.trim()) searchParams.set("q", params.q.trim());
  if (params.limit) searchParams.set("limit", String(params.limit));
  return searchParams.toString();
}

export async function fetchExpenses(params: {
  categoryId?: string;
  projectId?: string;
  paymentMethod?: string;
  from?: string;
  to?: string;
  q?: string;
  limit?: number;
}): Promise<{ expenses: ExpenseDTO[] }> {
  const qs = expenseQueryString(params);
  const response = await fetch(`/api/expenses${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as { expenses: ExpenseDTO[] };
}

export async function createExpense(
  payload: ExpensePayload & { amount: string | number; expenseDate: string; categoryId: string },
): Promise<ExpenseDTO> {
  const response = await fetch("/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { expense: ExpenseDTO };
  return body.expense;
}

export async function updateExpense(id: string, payload: ExpensePayload): Promise<ExpenseDTO> {
  const response = await fetch(`/api/expenses/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { expense: ExpenseDTO };
  return body.expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const response = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await readError(response));
}
