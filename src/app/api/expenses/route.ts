import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { createExpenseSchema, expenseQuerySchema } from "@/lib/validation/expense";
import { createExpense, listExpenses } from "@/server/expenses";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  try {
    const query = expenseQuerySchema.parse(Object.fromEntries(searchParams));
    const expenses = await listExpenses(query);
    return Response.json({ expenses });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = createExpenseSchema.parse(await request.json());
    const expense = await createExpense(input);
    return Response.json({ expense }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
