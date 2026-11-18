import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { calendarQuerySchema, createCalendarEventSchema } from "@/lib/validation/calendar";
import { createCalendarEvent, listCalendarEvents } from "@/server/calendar";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  try {
    const query = calendarQuerySchema.parse(Object.fromEntries(searchParams));
    const data = await listCalendarEvents(query);
    return Response.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = createCalendarEventSchema.parse(await request.json());
    const event = await createCalendarEvent(input);
    return Response.json({ event }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
