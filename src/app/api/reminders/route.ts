import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { createReminderSchema, reminderQuerySchema } from "@/lib/validation/reminder";
import { createReminder, listReminders } from "@/server/reminders";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  try {
    const query = reminderQuerySchema.parse(Object.fromEntries(searchParams));
    const reminders = await listReminders(query);
    return Response.json({ reminders });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = createReminderSchema.parse(await request.json());
    const reminder = await createReminder(input);
    return Response.json({ reminder }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
