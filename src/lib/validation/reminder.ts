import { z } from "zod";

export const REMINDER_STATUS_VALUES = ["PENDING", "SENT", "FAILED", "CANCELLED"] as const;
export const REMINDER_CHANNEL_VALUES = ["APP", "BROWSER"] as const;

export const reminderStatusSchema = z.enum(REMINDER_STATUS_VALUES);
export const reminderChannelSchema = z.enum(REMINDER_CHANNEL_VALUES);

const reminderFields = z.object({
  scheduledAt: z.coerce.date(),
  message: z.string().trim().min(1, "Message is required").max(1000),
  status: reminderStatusSchema,
  channel: reminderChannelSchema,
  taskId: z.string().min(1).nullish(),
  eventId: z.string().min(1).nullish(),
});

export const createReminderSchema = reminderFields.extend({
  status: reminderStatusSchema.default("PENDING"),
  channel: reminderChannelSchema.default("APP"),
});

export const updateReminderSchema = reminderFields.partial();

export const reminderQuerySchema = z.object({
  status: z.string().optional(),
  channel: z.string().optional(),
  scheduledAt: z.coerce.date().nullish(),
  taskId: z.string().optional(),
  eventId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
export type ReminderQueryInput = z.infer<typeof reminderQuerySchema>;
