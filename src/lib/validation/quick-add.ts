import { z } from "zod";
import { TASK_PRIORITY_VALUES } from "@/lib/validation/task";
import { CALENDAR_EVENT_TYPE_VALUES, CALENDAR_EVENT_STATUS_VALUES } from "@/lib/validation/calendar";

export const quickAddTaskSchema = z.object({
  type: z.literal("task"),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).nullish(),
  priority: z.enum(TASK_PRIORITY_VALUES).default("MEDIUM"),
  dueDate: z.coerce.date().nullish(),
  projectId: z.string().min(1).nullish(),
});

export const quickAddEventSchema = z.object({
  type: z.literal("event"),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).nullish(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  allDay: z.boolean().default(false),
  eventType: z.enum(CALENDAR_EVENT_TYPE_VALUES).default("GENERAL"),
  status: z.enum(CALENDAR_EVENT_STATUS_VALUES).default("CONFIRMED"),
  location: z.string().trim().max(200).nullish(),
  notes: z.string().trim().max(5000).nullish(),
  projectId: z.string().min(1).nullish(),
  taskId: z.string().min(1).nullish(),
}).refine((data) => data.endAt > data.startAt, {
  message: "End date must be after start date",
  path: ["endAt"],
});

export const quickAddExpenseSchema = z.object({
  type: z.literal("expense"),
  amount: z.coerce.number().positive("Amount must be positive"),
  description: z.string().trim().max(5000).nullish(),
  expenseDate: z.coerce.date().default(() => new Date()),
  categoryId: z.string().min(1, "Category is required"),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "MOBILE_WALLET", "OTHER"]).default("CASH"),
  vendor: z.string().trim().max(200).nullish(),
  projectId: z.string().min(1).nullish(),
});

export const quickAddSchema = z.discriminatedUnion("type", [
  quickAddTaskSchema,
  quickAddEventSchema,
  quickAddExpenseSchema,
]);

export type QuickAddInput = z.infer<typeof quickAddSchema>;
export type QuickAddTaskInput = z.infer<typeof quickAddTaskSchema>;
export type QuickAddEventInput = z.infer<typeof quickAddEventSchema>;
export type QuickAddExpenseInput = z.infer<typeof quickAddExpenseSchema>;
