import type { NoteWithRelations } from "@/server/notes";

export type NoteDTO = Omit<
  NoteWithRelations,
  "content" | "archivedAt" | "createdAt" | "updatedAt"
> & {
  content: unknown;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotePayload = {
  title?: string;
  content?: unknown;
  icon?: string | null;
  coverImage?: string | null;
  favorite?: boolean;
  order?: number;
  archivedAt?: string | null;
  projectId?: string | null;
  parentId?: string | null;
};

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export function noteQueryString(params: {
  projectId?: string;
  parentId?: string;
  favorite?: string;
  archived?: string;
  q?: string;
  limit?: number;
}): string {
  const searchParams = new URLSearchParams();
  if (params.projectId) searchParams.set("projectId", params.projectId);
  if (params.parentId) searchParams.set("parentId", params.parentId);
  if (params.favorite) searchParams.set("favorite", params.favorite);
  if (params.archived) searchParams.set("archived", params.archived);
  if (params.q?.trim()) searchParams.set("q", params.q.trim());
  if (params.limit) searchParams.set("limit", String(params.limit));
  return searchParams.toString();
}

export async function fetchNotes(params: {
  projectId?: string;
  parentId?: string;
  favorite?: string;
  archived?: string;
  q?: string;
  limit?: number;
}): Promise<{ notes: NoteDTO[] }> {
  const qs = noteQueryString(params);
  const response = await fetch(`/api/notes${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as { notes: NoteDTO[] };
}

export async function createNote(
  payload: NotePayload & { title: string },
): Promise<NoteDTO> {
  const response = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { note: NoteDTO };
  return body.note;
}

export async function updateNote(id: string, payload: NotePayload): Promise<NoteDTO> {
  const response = await fetch(`/api/notes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { note: NoteDTO };
  return body.note;
}

export async function deleteNote(id: string): Promise<void> {
  const response = await fetch(`/api/notes/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await readError(response));
}

export type NoteTag = { id: string; name: string; color: string | null };

export type NoteSummary = {
  id: string;
  title: string;
  icon: string | null;
  favorite: boolean;
  projectName: string | null;
  tagNames: string[];
  updatedAt: string;
};

export function noteSummary(note: NoteDTO): NoteSummary {
  const tags: NoteTag[] = (note as unknown as { taggedWith?: NoteTag[] }).taggedWith ?? [];
  return {
    id: note.id,
    title: note.title,
    icon: note.icon,
    favorite: note.favorite,
    projectName: (note as unknown as { project?: { name: string | null } | null }).project?.name ?? null,
    tagNames: tags.map((t) => t.name),
    updatedAt: note.updatedAt,
  };
}
