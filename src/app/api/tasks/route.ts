import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { createTaskSchema, taskQuerySchema } from "@/lib/validation/task";
import { createTask, getTaskStats, listTasks } from "@/server/tasks";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  try {
    const query = taskQuerySchema.parse(Object.fromEntries(searchParams));
    const [tasks, stats] = await Promise.all([listTasks(query), getTaskStats()]);
    return Response.json({ tasks, stats });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = createTaskSchema.parse(await request.json());
    const task = await createTask(input);
    return Response.json({ task }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
