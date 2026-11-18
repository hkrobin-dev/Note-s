# Ask your life — AI providers + RAG

"Ask your life" answers questions from your own notes, tasks, events and goals using retrieval-augmented generation (RAG). Two backends are supported, selected entirely on the **backend** with `AI_PROVIDER`:

| Provider | Value | Data flow | Good for |
|---|---|---|---|
| Ollama (default) | `ollama` | 100% local — no cloud calls | Privacy, offline use, self-hosting |
| NVIDIA NIM / Nemotron | `nvidia` | Text sent to NVIDIA's hosted API | No local GPU/Ollama needed; Vercel-friendly |

The frontend never receives API keys. Never set `NVIDIA_API_KEY` as a `NEXT_PUBLIC_*` variable.

## 1. Common requirement: pgvector

**Docker Compose (already configured):** the `db` service uses `pgvector/pgvector:pg16`.

**Managed Postgres (Neon, Supabase, etc.) — run once:**

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## 2. Choose a provider (backend `.env`)

Add to `backend/.env` (see `backend/.env.example`):

```env
AI_PROVIDER=ollama          # or "nvidia"
AI_RERANK_ENABLED=true      # NVIDIA only; extra API call for better precision
```

### Option A — Ollama (fully local)

```bash
ollama pull nomic-embed-text   # embeddings (768 dimensions)
ollama pull qwen2.5:3b         # chat / answers
ollama serve                   # http://localhost:11434
```

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_CHAT_MODEL=qwen2.5:3b
```

Inside Docker, Ollama runs on the *host*: `OLLAMA_BASE_URL=http://host.docker.internal:11434` (`docker-compose.yml` already sets this). Verify with `curl http://localhost:11434/api/tags`.

### Option B — NVIDIA NIM (hosted, no local model needed)

Get a key from [build.nvidia.com](https://build.nvidia.com/), then:

```env
AI_PROVIDER=nvidia
NVIDIA_API_KEY=nvapi-...                              # backend only — keep secret
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_CHAT_MODEL=nvidia/nemotron-3.5-bolt-e4b
NVIDIA_EMBED_MODEL=nvidia/nemotron-3.5-embed-1b
NVIDIA_RERANK_MODEL=nvidia/nemotron-3.5-rerank-8b
```

Notes:
- Nemotron Embed returns **2048 dimensions** and needs `input_type: passage|query` (handled by the provider).
- Rerank uses a separate host: `https://ai.api.nvidia.com/v1/retrieval/nvidia/nemotron-3.5-rerank-8b/reranking`. Override with `NVIDIA_RERANK_BASE_URL` for self-hosted NIM.
- The status endpoint calls `/v1/models`; some deployments don't expose it (a 404 still counts as online).

## 3. Apply the database migration

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

`DocumentChunk` keeps the original `embedding vector(768)` column and HNSW index (Ollama data is preserved) and **adds** `embeddingNvidia vector(2048)` with its **own** HNSW index and `embeddingProvider` / `embeddingModel` tags. The same migration is mirrored in root `prisma/migrations/` — keep both in sync.

## 4. Use it

1. Start the app (`docker compose up --build`, or backend + frontend separately).
2. Open **Ask your life** in the sidebar. The status card shows the active provider, models, and chunk count.
3. Click **Reindex** once after switching providers and after adding/changing lots of data. Reindexing is batched (default 25 records per call) so it works within serverless time limits; the UI loops the batches automatically.
4. Ask a question. Answers include numbered source links that open the exact note, task, meeting, etc.

Switching `AI_PROVIDER` requires a reindex: each provider embeds into its own column and retrieval filters by provider + model. Old vectors are never deleted or overwritten.

## How it works

```
notes / pages / tasks / events / meetings / goals / snippets / bookmarks / expenses
        │  flatten + chunk (~1100 chars, 160 overlap)
        ▼
active provider embed(model, "passage")  ──►  pgvector DocumentChunk
        │  question embedded with input_type "query" (same model)
        ▼
cosine top-k search (filtered by userId + provider + model, correct vector column)
        ▼
optional Nemotron rerank (NVIDIA)  ──►  reordered top-k
        ▼
active provider chat(model)  ──►  grounded answer + source links
```

Records are content-hashed *including* the provider/model key, so **Reindex** skips unchanged records. Deleted or archived records are removed from the active provider's index automatically.

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/ai/status` | Active provider, models, rerank setting, indexed chunk counts |
| `POST` | `/api/ai/reindex` | `{ "limit"?, "offset"? }` → batched index refresh with `nextOffset`/`done` |
| `POST` | `/api/ai/ask` | `{ "question": "...", "topK": 6 }` → answer + sources + provider metadata |
| `GET` | `/api/ai/chunks` | Chunk counts by source type for the current user |

## Reliability & security

- HTTP calls use bounded timeouts (`AI_REQUEST_TIMEOUT_MS`, default 60s) and bounded retries (`AI_MAX_RETRIES`, default 2) with `Retry-After` support on 429/5xx.
- Errors are sanitized: provider response bodies, questions, document text and API keys are never logged or returned to the client.
- Tighter per-IP rate limits apply to `/ask` (20/min) and `/reindex` (10/min). Note the default limiter is in-memory and not durable across serverless instances.
- Access is always filtered by `userId` (demo mode uses `demo_user_001`). With `AUTH_ENFORCE=true`, JWT protection applies too.

## Troubleshooting

- **"is not reachable" (Ollama)** — run `ollama serve`; check `OLLAMA_BASE_URL`. From Docker use `host.docker.internal`.
- **"NVIDIA_API_KEY is not configured"** — set the key in `backend/.env` (or your host's secret store) and restart the backend.
- **"model or endpoint not found" (404)** — verify `NVIDIA_CHAT_MODEL` / `NVIDIA_EMBED_MODEL` / `NVIDIA_RERANK_MODEL` IDs in build.nvidia.com.
- **"dimension mismatch"** — don't insert vectors from another model into the same column. Change `NVIDIA_EMBED_DIM` / `OLLAMA_EMBED_DIM` only if your model really differs, then reindex.
- **"type vector does not exist"** — pgvector isn't installed; see step 1.
- **Slow answers** — set `AI_RERANK_ENABLED=false`, reduce `topK`, or use a smaller chat model.
- **Serverless timeouts on reindex** — lower `AI_REINDEX_BATCH` (e.g. 10); the UI still loops batches. For very large datasets, drive `/api/ai/reindex` from a queue/cron instead of the browser.
