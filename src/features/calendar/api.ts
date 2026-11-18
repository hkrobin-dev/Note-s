import type { CalendarEventWithRelations, OccurrenceInstance } from "@/server/calendar";

export type CalendarEventDTO = Omit<
  CalendarEventWithRelations,
  "startAt" | "endAt" | "createdAt" | "updatedAt"
> & {
  startAt: string;
  endAt: string;
  createdAt: string;
  updatedAt: string;
};

export type OccurrenceDTO = Omit<OccurrenceInstance, "startAt" | "endAt"> & {
  startAt: string;
  endAt: string;
};

export type CalendarEventsResponse = {
  events: CalendarEventDTO[];
  occurrences: OccurrenceDTO[] | null;
};

export type CalendarEventPayload = {
  title?: string;
  description?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  allDay?: boolean;
  eventType?: string;
  location?: string | null;
  notes?: string | null;
  status?: string;
  projectId?: string | null;
  taskId?: string | null;
};

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export function calendarQueryString(params: {
  expand?: "occurrences";
  from?: string;
  to?: string;
  status?: string;
  eventType?: string;
  projectId?: string;
  taskId?: string;
  q?: string;
  limit?: number;
}): string {
  const searchParams = new URLSearchParams();
  if (params.expand) searchParams.set("expand", params.expand);
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  if (params.status) searchParams.set("status", params.status);
  if (params.eventType) searchParams.set("eventType", params.eventType);
  if (params.projectId) searchParams.set("projectId", params.projectId);
  if (params.taskId) searchParams.set("taskId", params.taskId);
  if (params.q?.trim()) searchParams.set("q", params.q.trim());
  if (params.limit) searchParams.set("limit", String(params.limit));
  return searchParams.toString();
}

export async function fetchCalendarEvents(params: {
  expand?: "occurrences";
  from?: string;
  to?: string;
  status?: string;
  eventType?: string;
  projectId?: string;
  taskId?: string;
  q?: string;
  limit?: number;
}): Promise<CalendarEventsResponse> {
  const qs = calendarQueryString(params);
  const response = await fetch(`/api/calendar/events${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as CalendarEventsResponse;
}

export async function fetchCalendarEvent(id: string): Promise<CalendarEventDTO> {
  const response = await fetch(`/api/calendar/events/${id}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { event: CalendarEventDTO };
  return body.event;
}

export async function createCalendarEvent(
  payload: CalendarEventPayload & { title: string; startAt: string; endAt: string },
): Promise<CalendarEventDTO> {
  const response = await fetch("/api/calendar/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { event: CalendarEventDTO };
  return body.event;
}

export async function updateCalendarEvent(id: string, payload: CalendarEventPayload): Promise<CalendarEventDTO> {
  const response = await fetch(`/api/calendar/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { event: CalendarEventDTO };
  return body.event;
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const response = await fetch(`/api/calendar/events/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await readError(response));
}
