import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/api-response";
import type {
  CalendarQueryInput,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from "@/lib/validation/calendar";

const MAX_OCCURRENCES = 365;
const DEFAULT_LIMIT = 100;

export const calendarEventInclude = {
  project: { select: { id: true, name: true, accentColor: true } },
  task: { select: { id: true, title: true, status: true } },
  recurrence: true,
  reminders: { select: { id: true, scheduledAt: true, message: true, status: true, channel: true } },
} satisfies Prisma.CalendarEventInclude;

export type CalendarEventWithRelations = Prisma.CalendarEventGetPayload<{ include: typeof calendarEventInclude }>;

export interface OccurrenceInstance {
  id: string;
  baseEventId: string;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  eventType: string;
  location: string | null;
  notes: string | null;
  status: string;
  recurrenceId: string | null;
}

function occurrence(event: CalendarEventWithRelations, startAt: Date, index: number): OccurrenceInstance {
  const duration = event.endAt.getTime() - event.startAt.getTime();
  return {
    id: `${event.id}#occ-${index}`,
    baseEventId: event.id,
    title: event.title,
    description: event.description,
    startAt: new Date(startAt),
    endAt: new Date(startAt.getTime() + duration),
    allDay: event.allDay,
    eventType: event.eventType,
    location: event.location,
    notes: event.notes,
    status: event.status,
    recurrenceId: event.recurrence?.id ?? null,
  };
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function addMonthsCalendar(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function addYearsCalendar(date: Date, years: number): Date {
  const result = new Date(date);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
}

function nextCursor(cursor: Date, frequency: string, interval: number): Date {
  switch (frequency) {
    case "DAILY":
      return addDays(cursor, interval);
    case "WEEKLY":
      return addDays(cursor, 7 * interval);
    case "MONTHLY":
      return addMonthsCalendar(cursor, interval);
    case "YEARLY":
      return addYearsCalendar(cursor, interval);
    case "CUSTOM":
    default:
      return addDays(cursor, 7 * interval);
  }
}

/** Expand a recurring event into bounded, non-persisted occurrence instances within [from, to]. */
export function expandOccurrences(event: CalendarEventWithRelations, from: Date, to: Date): OccurrenceInstance[] {
  const rule = event.recurrence;
  const baseStart = new Date(event.startAt);
  const fromMs = from.getTime();
  const toMs = to.getTime();
  const untilMs = rule?.until ? new Date(rule.until).getTime() : Infinity;

  const single = () => {
    const inst = occurrence(event, baseStart, 0);
    return inst.startAt.getTime() <= toMs && inst.endAt.getTime() >= fromMs ? [inst] : [];
  };

  if (!rule) return single();

  const limit = Math.min(rule.maxOccurrences ?? MAX_OCCURRENCES, MAX_OCCURRENCES);
  const occurrences: OccurrenceInstance[] = [];

  const weeklyish = rule.frequency === "WEEKLY" || rule.frequency === "CUSTOM";
  const allowedWeekdays =
    rule.weekdays && rule.weekdays.length > 0 ? rule.weekdays : [baseStart.getUTCDay()];

  if (weeklyish) {
    // Week anchors starting at the week that contains baseStart; emit each allowed
    // weekday within each anchor week (skipping anything before baseStart).
    const anchor = new Date(baseStart);
    anchor.setUTCDate(baseStart.getUTCDate() - baseStart.getUTCDay());
    let weekAnchor = new Date(anchor);
    let guard = 0;
    while (
      occurrences.length < limit &&
      weekAnchor.getTime() <= untilMs &&
      weekAnchor.getTime() <= toMs &&
      guard++ < 100000
    ) {
      for (const wd of allowedWeekdays) {
        if (occurrences.length >= limit) break;
        const candidate = addDays(weekAnchor, wd);
        if (candidate.getTime() < baseStart.getTime()) continue;
        if (candidate.getTime() > untilMs || candidate.getTime() > toMs) continue;
        if (candidate.getTime() >= fromMs) {
          occurrences.push(occurrence(event, candidate, occurrences.length));
        }
      }
      weekAnchor = addDays(weekAnchor, 7 * rule.interval);
    }
    return occurrences;
  }

  let cursor = new Date(baseStart);
  if (cursor.getTime() < fromMs) {
    let stepped = new Date(baseStart);
    while (stepped.getTime() < fromMs && stepped.getTime() <= untilMs) {
      stepped = nextCursor(stepped, rule.frequency, rule.interval);
    }
    cursor = stepped;
  }

  let guard = 0;
  while (
    occurrences.length < limit &&
    cursor.getTime() <= untilMs &&
    cursor.getTime() <= toMs &&
    guard++ < 100000
  ) {
    if (cursor.getTime() >= fromMs) {
      occurrences.push(occurrence(event, cursor, occurrences.length));
    }
    cursor = nextCursor(cursor, rule.frequency, rule.interval);
  }

  return occurrences;
}

export async function listCalendarEvents(query: CalendarQueryInput) {
  const where: Prisma.CalendarEventWhereInput = {};

  if (query.status) where.status = query.status;
  if (query.eventType) where.eventType = query.eventType;
  if (query.projectId) where.projectId = query.projectId;
  if (query.taskId) where.taskId = query.taskId;

  if (query.expand !== "occurrences" && (query.from || query.to)) {
    where.startAt = {};
    if (query.from) where.startAt.gte = query.from;
    if (query.to) where.startAt.lte = query.to;
  }

  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
      { location: { contains: query.q, mode: "insensitive" } },
    ];
  }

  const events = await prisma.calendarEvent.findMany({
    where,
    include: calendarEventInclude,
    orderBy: [{ startAt: "asc" }, { createdAt: "desc" }],
    take: query.limit ?? DEFAULT_LIMIT,
  });

  if (query.expand === "occurrences" && query.from && query.to) {
    const occurrences = events.flatMap((event) =>
      expandOccurrences(event as CalendarEventWithRelations, query.from!, query.to!),
    );
    occurrences.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    return { events, occurrences };
  }

  return { events, occurrences: undefined };
}

export async function getCalendarEvent(id: string) {
  const event = await prisma.calendarEvent.findUnique({
    where: { id },
    include: calendarEventInclude,
  });
  if (!event) throw new NotFoundError("Calendar event not found");
  return event;
}

export async function createCalendarEvent(input: CreateCalendarEventInput) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.calendarEvent.create({
      data: input,
      include: calendarEventInclude,
    });

    await tx.activityLog.create({
      data: {
        entityType: "EVENT",
        entityId: event.id,
        action: "CREATED",
        detail: { title: event.title, startAt: event.startAt },
      },
    });

    return event;
  });
}

export async function updateCalendarEvent(id: string, input: UpdateCalendarEventInput) {
  const existing = await prisma.calendarEvent.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!existing) throw new NotFoundError("Calendar event not found");

  return prisma.$transaction(async (tx) => {
    const event = await tx.calendarEvent.update({
      where: { id },
      data: input,
      include: calendarEventInclude,
    });

    await tx.activityLog.create({
      data: {
        entityType: "EVENT",
        entityId: event.id,
        action: "UPDATED",
        detail: { title: event.title },
      },
    });

    return event;
  });
}

export async function deleteCalendarEvent(id: string) {
  const existing = await prisma.calendarEvent.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!existing) throw new NotFoundError("Calendar event not found");

  return prisma.$transaction(async (tx) => {
    await tx.calendarEvent.delete({ where: { id } });
    await tx.activityLog.create({
      data: {
        entityType: "EVENT",
        entityId: existing.id,
        action: "DELETED",
        detail: { title: existing.title },
      },
    });
    return existing;
  });
}
