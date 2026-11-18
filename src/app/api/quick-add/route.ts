import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { quickAddSchema } from "@/lib/validation/quick-add";
import { handleQuickAdd } from "@/server/quick-add";

export async function POST(request: NextRequest) {
  try {
    const input = quickAddSchema.parse(await request.json());
    const result = await handleQuickAdd(input.type, input);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
