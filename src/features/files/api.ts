import type { FileWithRelations } from "@/server/files";

export type FileDTO = Omit<
  FileWithRelations,
  "createdAt" | "deletedAt"
> & {
  createdAt: string;
  deletedAt: string | null;
};

export type FilePayload = {
  filename?: string;
  safeFilename?: string | null;
  storagePath?: string | null;
  mimeType?: string | null;
  byteSize?: number | null;
  checksum?: string | null;
};

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export function fileQueryString(params: {
  mimeType?: string;
  q?: string;
  limit?: number;
}): string {
  const searchParams = new URLSearchParams();
  if (params.mimeType) searchParams.set("mimeType", params.mimeType);
  if (params.q?.trim()) searchParams.set("q", params.q.trim());
  if (params.limit) searchParams.set("limit", String(params.limit));
  return searchParams.toString();
}

export async function fetchFiles(params: {
  mimeType?: string;
  q?: string;
  limit?: number;
}): Promise<{ files: FileDTO[] }> {
  const qs = fileQueryString(params);
  const response = await fetch(`/api/files${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as { files: FileDTO[] };
}

export async function createFile(
  payload: FilePayload & { filename: string; safeFilename: string; storagePath: string; mimeType: string; byteSize: number },
): Promise<FileDTO> {
  const response = await fetch("/api/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { file: FileDTO };
  return body.file;
}

export async function updateFile(id: string, payload: FilePayload): Promise<FileDTO> {
  const response = await fetch(`/api/files/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { file: FileDTO };
  return body.file;
}

export async function deleteFile(id: string): Promise<void> {
  const response = await fetch(`/api/files/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await readError(response));
}

export type FileLink = { id: string; linkedId: string; linkedKind: string; createdAt: string };

export type FileSummary = {
  id: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  checksum: string | null;
  linkCount: number;
  createdAt: string;
};

export function fileSummary(file: FileDTO): FileSummary {
  const links: FileLink[] = (file as unknown as { links?: FileLink[] }).links ?? [];
  return {
    id: file.id,
    filename: file.filename,
    mimeType: file.mimeType,
    byteSize: file.byteSize,
    checksum: file.checksum,
    linkCount: links.length,
    createdAt: file.createdAt,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
