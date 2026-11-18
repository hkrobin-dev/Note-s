import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { updateReminderSchema } from "@/lib/validation/reminder";
import { deleteReminder, getReminder, updateReminder } from "@/server/reminders";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const reminder = await getReminder(id);
    return Response.json({ reminder });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const input = updateReminderSchema.parse(await request.json());
    const reminder = await updateReminder(id, input);
    return Response.json({ reminder });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteReminder(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
