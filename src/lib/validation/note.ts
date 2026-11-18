import { z } from "zod";

const noteFields = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  content: z.any().nullish(),
  icon: z.string().trim().max(50).nullish(),
  coverImage: z.string().trim().max(500).nullish(),
  favorite: z.boolean().default(false),
  order: z.coerce.number().int().default(0),
  archivedAt: z.coerce.date().nullish(),
  projectId: z.string().min(1).nullish(),
  parentId: z.string().min(1).nullish(),
});

export const createNoteSchema = noteFields.extend({
  favorite: z.boolean().default(false),
  order: z.coerce.number().int().default(0),
});

export const updateNoteSchema = noteFields.partial();

export const noteQuerySchema = z.object({
  projectId: z.string().optional(),
  parentId: z.string().optional(),
  favorite: z.enum(["true", "false"]).optional(),
  archived: z.enum(["true", "false"]).optional(),
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type NoteQueryInput = z.infer<typeof noteQuerySchema>;
