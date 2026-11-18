-- Serverless-safe file storage: keep uploaded bytes in Neon instead of the
-- ephemeral serverless filesystem. Existing rows keep working via storagePath.
ALTER TABLE "StoredFile" ADD COLUMN IF NOT EXISTS "data" BYTEA;
