-- Additive, provider-aware vector storage for NVIDIA Nemotron embeddings.
-- Existing Ollama vectors (vector(768)) and their HNSW index are left untouched.
ALTER TABLE "DocumentChunk" ALTER COLUMN "embedding" DROP NOT NULL;

ALTER TABLE "DocumentChunk" ADD COLUMN IF NOT EXISTS "embeddingNvidia" vector(2048);
ALTER TABLE "DocumentChunk" ADD COLUMN IF NOT EXISTS "embeddingProvider" TEXT NOT NULL DEFAULT 'ollama';
ALTER TABLE "DocumentChunk" ADD COLUMN IF NOT EXISTS "embeddingModel" TEXT NOT NULL DEFAULT 'nomic-embed-text';

-- Separate index: 768-dim and 2048-dim vectors must never share one HNSW index.
CREATE INDEX IF NOT EXISTS "DocumentChunk_nvidiaEmbedding_idx"
  ON "DocumentChunk" USING hnsw ("embeddingNvidia" vector_cosine_ops)
  WHERE "embeddingNvidia" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "DocumentChunk_provider_idx"
  ON "DocumentChunk"("userId", "embeddingProvider", "embeddingModel");
