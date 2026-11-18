import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { updateExpenseSchema } from "@/lib/validation/expense";
import { deleteExpense, getExpense, updateExpense } from "@/server/expenses";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const expense = await getExpense(id);
    return Response.json({ expense });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const input = updateExpenseSchema.parse(await request.json());
    const expense = await updateExpense(id, input);
    return Response.json({ expense });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteExpense(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
