import type { ProjectWithRelations } from "@/server/projects";

export type ProjectDTO = Omit<
  ProjectWithRelations,
  "startDate" | "deadline" | "createdAt" | "updatedAt" | "archivedAt"
> & {
  startDate: string | null;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type ProjectPayload = {
  name?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  startDate?: string | null;
  deadline?: string | null;
  accentColor?: string | null;
  icon?: string | null;
};

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export function projectQueryString(params: {
  status?: string;
  priority?: string;
  q?: string;
  limit?: number;
}): string {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.priority) searchParams.set("priority", params.priority);
  if (params.q?.trim()) searchParams.set("q", params.q.trim());
  if (params.limit) searchParams.set("limit", String(params.limit));
  return searchParams.toString();
}

export async function fetchProjects(params: {
  status?: string;
  priority?: string;
  q?: string;
  limit?: number;
}): Promise<{ projects: ProjectDTO[] }> {
  const qs = projectQueryString(params);
  const response = await fetch(`/api/projects${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as { projects: ProjectDTO[] };
}

export async function createProject(
  payload: ProjectPayload & { name: string },
): Promise<ProjectDTO> {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { project: ProjectDTO };
  return body.project;
}

export async function updateProject(id: string, payload: ProjectPayload): Promise<ProjectDTO> {
  const response = await fetch(`/api/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { project: ProjectDTO };
  return body.project;
}

export async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`/api/projects/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await readError(response));
}

export type ProjectTask = {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  priority: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  status: string;
  priority: string;
  taskCount: number;
  openTasks: number;
  progress: number | null;
};

export function projectSummary(project: ProjectDTO): ProjectSummary {
  const tasks: ProjectTask[] = (project as unknown as { tasks?: ProjectTask[] }).tasks ?? [];
  const openTasks = tasks.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED").length;
  const trackable = tasks.filter((t) => t.status !== "CANCELLED").length;
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    priority: project.priority,
    taskCount: tasks.length,
    openTasks,
    progress: trackable === 0 ? null : openTasks / trackable,
  };
}
