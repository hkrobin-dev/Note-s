import type { TaskPriority, TaskStatus } from "@/types";

export type TaskDTO = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  originalDueDate: string | null;
  rescheduledFrom: string | null;
  estimatedMins: number | null;
  projectId: string | null;
  parentTaskId: string | null;
  project: { id: string; name: string; accentColor: string | null } | null;
  taggedWith: { tag: { id: string; name: string; color: string | null } }[];
};

export type TaskStatsDTO = {
  open: number;
  dueToday: number;
  overdue: number;
  completedToday: number;
};

export type TasksResponse = { tasks: TaskDTO[]; stats: TaskStatsDTO };

export type TaskFilters = {
  due?: "today" | "week" | "overdue";
  priority?: TaskPriority;
  includeDone?: boolean;
  q?: string;
};

export type TaskPayload = {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  estimatedMins?: number | null;
  projectId?: string | null;
  tagIds?: string[];
};

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export function taskQueryString(filters: TaskFilters): string {
  const params = new URLSearchParams();
  if (filters.due) params.set("due", filters.due);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.includeDone) params.set("includeDone", "true");
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  return params.toString();
}

export async function fetchTasks(filters: TaskFilters): Promise<TasksResponse> {
  const qs = taskQueryString(filters);
  const response = await fetch(`/api/tasks${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as TasksResponse;
}

export async function createTask(payload: TaskPayload & { title: string }): Promise<TaskDTO> {
  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { task: TaskDTO };
  return body.task;
}

export async function updateTask(id: string, payload: TaskPayload): Promise<TaskDTO> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { task: TaskDTO };
  return body.task;
}

export async function deleteTask(id: string): Promise<void> {
  const response = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await readError(response));
}
