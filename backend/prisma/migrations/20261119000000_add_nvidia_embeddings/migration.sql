-- Additive, provider-aware vector storage for NVIDIA Nemotron embeddings.
-- Existing Ollama vectors (vector(768)) and their HNSW index are left untouched.
ALTER TABLE "DocumentChunk" ALTER COLUMN "embedding" DROP NOT NULL;

ALTER TABLE "DocumentChunk" ADD COLUMN IF NOT EXISTS "embeddingNvidia" vector(2048);
ALTER TABLE "DocumentChunk" ADD COLUMN IF NOT EXISTS "embeddingProvider" TEXT NOT NULL DEFAULT 'ollama';
ALTER TABLE "DocumentChunk" ADD COLUMN IF NOT EXISTS "embeddingModel" TEXT NOT NULL DEFAULT 'nomic-embed-text';

-- No vector index on embeddingNvidia: pgvector's HNSW and IVFFlat indexes
-- support at most 2000 dimensions, but NVIDIA Nemotron embeddings are 2048.
-- Cosine search over this column is therefore a sequential scan, which is
-- acceptable for a personal knowledge base. The 768-dim Ollama column keeps
-- its HNSW index from the previous migration.
CREATE INDEX IF NOT EXISTS "DocumentChunk_provider_idx"
  ON "DocumentChunk"("userId", "embeddingProvider", "embeddingModel");
