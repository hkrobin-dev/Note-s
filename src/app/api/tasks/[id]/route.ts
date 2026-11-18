import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { updateTaskSchema } from "@/lib/validation/task";
import { deleteTask, getTask, updateTask } from "@/server/tasks";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const task = await getTask(id);
    if (!task) return Response.json({ error: "Task not found" }, { status: 404 });
    return Response.json({ task });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const input = updateTaskSchema.parse(await request.json());
    const task = await updateTask(id, input);
    return Response.json({ task });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteTask(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
