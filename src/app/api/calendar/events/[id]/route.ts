import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { updateCalendarEventSchema } from "@/lib/validation/calendar";
import { deleteCalendarEvent, getCalendarEvent, updateCalendarEvent } from "@/server/calendar";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const event = await getCalendarEvent(id);
    return Response.json({ event });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const input = updateCalendarEventSchema.parse(await request.json());
    const event = await updateCalendarEvent(id, input);
    return Response.json({ event });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteCalendarEvent(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
