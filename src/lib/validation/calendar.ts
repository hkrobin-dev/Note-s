import { z } from "zod";

export const CALENDAR_EVENT_TYPE_VALUES = ["GENERAL", "MEETING", "DEADLINE", "PERSONAL"] as const;
export const CALENDAR_EVENT_STATUS_VALUES = ["CONFIRMED", "TENTATIVE", "CANCELLED"] as const;

export const calendarEventTypeSchema = z.enum(CALENDAR_EVENT_TYPE_VALUES);
export const calendarEventStatusSchema = z.enum(CALENDAR_EVENT_STATUS_VALUES);

/** Fields shared by create and update — no defaults here. */
const calendarEventFields = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).nullish(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  allDay: z.boolean().default(false),
  eventType: calendarEventTypeSchema,
  location: z.string().trim().max(200).nullish(),
  notes: z.string().trim().max(5000).nullish(),
  status: calendarEventStatusSchema,
  projectId: z.string().min(1).nullish(),
  taskId: z.string().min(1).nullish(),
});

export const createCalendarEventSchema = calendarEventFields.extend({
  eventType: calendarEventTypeSchema.default("GENERAL"),
  status: calendarEventStatusSchema.default("CONFIRMED"),
  allDay: z.boolean().default(false),
}).refine((data) => data.endAt > data.startAt, {
  message: "End date must be after start date",
  path: ["endAt"],
});

export const updateCalendarEventSchema = calendarEventFields.partial().refine((data) => {
  if (!data.startAt || !data.endAt) return true;
  return data.endAt > data.startAt;
}, {
  message: "End date must be after start date",
  path: ["endAt"],
});

export const calendarQuerySchema = z.object({
  expand: z.enum(["occurrences"]).optional(),
  from: z.coerce.date().nullish(),
  to: z.coerce.date().nullish(),
  status: z.string().optional(),
  eventType: z.string().optional(),
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;
export type CalendarQueryInput = z.infer<typeof calendarQuerySchema>;
