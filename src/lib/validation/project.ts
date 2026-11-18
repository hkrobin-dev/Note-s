import { z } from "zod";

export const PROJECT_STATUS_VALUES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"] as const;
export const PROJECT_PRIORITY_VALUES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const projectStatusSchema = z.enum(PROJECT_STATUS_VALUES);
export const projectPrioritySchema = z.enum(PROJECT_PRIORITY_VALUES);

const projectFields = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(5000).nullish(),
  status: projectStatusSchema,
  priority: projectPrioritySchema,
  startDate: z.coerce.date().nullish(),
  deadline: z.coerce.date().nullish(),
  accentColor: z.string().trim().max(50).nullish(),
  icon: z.string().trim().max(50).nullish(),
});

export const createProjectSchema = projectFields.extend({
  status: projectStatusSchema.default("PLANNING"),
  priority: projectPrioritySchema.default("MEDIUM"),
}).refine((data) => {
  if (!data.startDate || !data.deadline) return true;
  return data.deadline > data.startDate;
}, {
  message: "Deadline must be after start date",
  path: ["deadline"],
});

export const updateProjectSchema = projectFields.partial().refine((data) => {
  if (!data.startDate || !data.deadline) return true;
  return data.deadline > data.startDate;
}, {
  message: "Deadline must be after start date",
  path: ["deadline"],
});

export const projectQuerySchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectQueryInput = z.infer<typeof projectQuerySchema>;
