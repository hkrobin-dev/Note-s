import { z } from "zod";

export const TASK_STATUS_VALUES = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
export const TASK_PRIORITY_VALUES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const taskStatusSchema = z.enum(TASK_STATUS_VALUES);
export const taskPrioritySchema = z.enum(TASK_PRIORITY_VALUES);

/** Fields shared by create and update — no defaults here. */
const taskFields = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).nullish(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  startDate: z.coerce.date().nullish(),
  dueDate: z.coerce.date().nullish(),
  estimatedMins: z.number().int().positive().max(60 * 24 * 30).nullish(),
  projectId: z.string().min(1).nullish(),
  parentTaskId: z.string().min(1).nullish(),
  tagIds: z.array(z.string().min(1)).max(20),
});

export const createTaskSchema = taskFields.extend({
  status: taskStatusSchema.default("TODO"),
  priority: taskPrioritySchema.default("MEDIUM"),
  tagIds: z.array(z.string().min(1)).max(20).default([]),
});

export const updateTaskSchema = taskFields.partial();

export const taskQuerySchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  projectId: z.string().optional(),
  q: z.string().trim().max(200).optional(),
  due: z.enum(["today", "overdue", "week"]).optional(),
  includeDone: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskQueryInput = z.infer<typeof taskQuerySchema>;
