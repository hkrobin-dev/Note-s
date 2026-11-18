import type { ReminderWithRelations } from "@/server/reminders";

export type ReminderDTO = Omit<
  ReminderWithRelations,
  "scheduledAt" | "createdAt" | "updatedAt" | "sentAt" | "completedAt"
> & {
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  completedAt: string | null;
};

export type ReminderPayload = {
  scheduledAt?: string | null;
  message?: string;
  status?: "PENDING" | "SENT" | "FAILED" | "CANCELLED";
  channel?: "APP" | "BROWSER";
  taskId?: string | null;
  eventId?: string | null;
};

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export function reminderQueryString(params: {
  status?: string;
  channel?: string;
  scheduledAt?: string;
  taskId?: string;
  eventId?: string;
  limit?: number;
}): string {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.channel) searchParams.set("channel", params.channel);
  if (params.scheduledAt) searchParams.set("scheduledAt", params.scheduledAt);
  if (params.taskId) searchParams.set("taskId", params.taskId);
  if (params.eventId) searchParams.set("eventId", params.eventId);
  if (params.limit) searchParams.set("limit", String(params.limit));
  return searchParams.toString();
}

export async function fetchReminders(params: {
  status?: string;
  channel?: string;
  scheduledAt?: string;
  taskId?: string;
  eventId?: string;
  limit?: number;
}): Promise<{ reminders: ReminderDTO[] }> {
  const qs = reminderQueryString(params);
  const response = await fetch(`/api/reminders${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as { reminders: ReminderDTO[] };
}

export async function createReminder(payload: ReminderPayload & { scheduledAt: string; message: string }): Promise<ReminderDTO> {
  const response = await fetch("/api/reminders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { reminder: ReminderDTO };
  return body.reminder;
}

export async function updateReminder(id: string, payload: ReminderPayload): Promise<ReminderDTO> {
  const response = await fetch(`/api/reminders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { reminder: ReminderDTO };
  return body.reminder;
}

export async function deleteReminder(id: string): Promise<void> {
  const response = await fetch(`/api/reminders/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await readError(response));
}
