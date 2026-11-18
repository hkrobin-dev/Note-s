import { z } from "zod";

const fileFields = z.object({
  filename: z.string().trim().min(1, "Filename is required").max(300),
  safeFilename: z.string().trim().min(1, "Safe filename is required").max(300),
  storagePath: z.string().trim().min(1, "Storage path is required").max(500),
  mimeType: z.string().trim().min(1, "MIME type is required").max(100),
  byteSize: z.coerce.number().int().nonnegative("Byte size must be non-negative"),
  checksum: z.string().trim().max(128).nullish(),
});

export const createFileSchema = fileFields;

export const updateFileSchema = fileFields.partial();

export const fileQuerySchema = z.object({
  mimeType: z.string().optional(),
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export type CreateFileInput = z.infer<typeof createFileSchema>;
export type UpdateFileInput = z.infer<typeof updateFileSchema>;
export type FileQueryInput = z.infer<typeof fileQuerySchema>;
