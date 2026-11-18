// NVIDIA NIM provider (hosted API or self-hosted NIM).
// All calls are made server-side; the API key never reaches the frontend.
import { callApi } from "./http";
import { AiError, AiProvider, ChatMessage, EmbedInputType } from "./types";

const trimSlash = (v: string) => v.replace(/\/$/, "");
const baseUrl = () => trimSlash(process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1");
const rerankBaseUrl = () => trimSlash(process.env.NVIDIA_RERANK_BASE_URL || "https://ai.api.nvidia.com/v1");
const chatModel = () => process.env.NVIDIA_CHAT_MODEL || "nvidia/nemotron-3.5-bolt-e4b";
const embedModel = () => process.env.NVIDIA_EMBED_MODEL || "nvidia/nemotron-3.5-embed-1b";
const rerankModel = () => process.env.NVIDIA_RERANK_MODEL || "nvidia/nemotron-3.5-rerank-8b";

function embedDimension(): number {
  const n = Number(process.env.NVIDIA_EMBED_DIM || 2048);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 2048;
}

function authHeaders(): Record<string, string> {
  const key = (process.env.NVIDIA_API_KEY || "").trim();
  if (!key) throw new AiError("NVIDIA_API_KEY is not configured on the backend.", 500, "NVIDIA_KEY_MISSING");
  return { Authorization: `Bearer ${key}`, Accept: "application/json" };
}

export function createNvidiaProvider(): AiProvider {
  return {
    id: "nvidia",
    label: "NVIDIA NIM (Nemotron)",
    embedModel: embedModel(),
    chatModel: chatModel(),
    rerankModel: rerankModel(),
    embeddingDimension: embedDimension(),
    supportsRerank: true,

    async embedTexts(texts: string[], inputType: EmbedInputType): Promise<number[][]> {
      if (!texts.length) return [];
      const vectors: number[][] = [];
      for (let i = 0; i < texts.length; i += 16) {
        const batch = texts.slice(i, i + 16);
        // input_type is mandatory for Nemotron Embed: wrong prefix badly hurts retrieval.
        const data = await callApi<{ data?: Array<{ index?: number; embedding?: number[] }> }>(
          `${baseUrl()}/embeddings`,
          {
            method: "POST",
            headers: authHeaders(),
            body: {
              model: embedModel(),
              input: batch,
              input_type: inputType,
              modality: "text",
              embedding_type: "float",
              encoding_format: "float",
              truncate: "END",
            },
          },
        );
        const rows = Array.isArray(data?.data) ? [...data.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0)) : [];
        if (rows.length !== batch.length) throw new AiError("Embedding provider returned an unexpected number of vectors.", 502, "EMBED_COUNT");
        for (const row of rows) {
          if (!Array.isArray(row.embedding)) throw new AiError("Embedding provider returned an invalid vector.", 502, "EMBED_FORMAT");
          if (row.embedding.length !== embedDimension()) {
            throw new AiError(
              `Embedding dimension mismatch: expected ${embedDimension()}, received ${row.embedding.length}. Reindex after changing the embedding model or dimension.`,
              500,
              "EMBED_DIM_MISMATCH",
            );
          }
          vectors.push(row.embedding);
        }
      }
      return vectors;
    },

    async embedOne(text: string, inputType: EmbedInputType): Promise<number[]> {
      const [vector] = await this.embedTexts([text], inputType);
      if (!vector) throw new AiError("Embedding provider returned no vector.", 502, "EMBED_EMPTY");
      return vector;
    },

    async chat(messages: ChatMessage[], temperature = 0.2): Promise<string> {
      const data = await callApi<{ choices?: Array<{ message?: { content?: string } }> }>(
        `${baseUrl()}/chat/completions`,
        {
          method: "POST",
          headers: authHeaders(),
          body: {
            model: chatModel(),
            messages,
            temperature,
            max_tokens: 1024,
            stream: false,
          },
        },
      );
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new AiError("Chat provider returned no answer.", 502, "CHAT_EMPTY");
      }
      return content.trim();
    },

    async rerank(query: string, passages: string[]): Promise<number[]> {
      if (!passages.length) return [];
      const hosted = /api\.nvidia\.com/.test(rerankBaseUrl());
      const path = hosted ? `/retrieval/${rerankModel()}/reranking` : "/ranking";
      const data = await callApi<{ rankings?: Array<{ index?: number; logit?: number }> }>(
        `${rerankBaseUrl()}${path}`,
        {
          method: "POST",
          headers: authHeaders(),
          body: {
            model: rerankModel(),
            query: { text: query },
            passages: passages.map((text) => ({ text })),
            truncate: "END",
          },
        },
      );
      const scores = new Array<number>(passages.length).fill(Number.NEGATIVE_INFINITY);
      const rankings = Array.isArray(data?.rankings) ? data.rankings : [];
      if (!rankings.length) throw new AiError("Rerank provider returned no rankings.", 502, "RERANK_EMPTY");
      for (const r of rankings) {
        const index = Number(r?.index);
        if (Number.isInteger(index) && index >= 0 && index < passages.length && typeof r.logit === "number") {
          scores[index] = r.logit;
        }
      }
      return scores;
    },

    async status() {
      if (!process.env.NVIDIA_API_KEY) {
        return { online: false, models: [], error: "NVIDIA_API_KEY is not configured on the backend." };
      }
      try {
        const data = await callApi<{ data?: Array<{ id?: string }> }>(`${baseUrl()}/models`, {
          headers: authHeaders(),
          timeoutMs: 5_000,
          retries: 0,
        });
        const models = (data?.data ?? []).map((m) => String(m.id ?? "")).filter(Boolean);
        return { online: true, models };
      } catch (err: any) {
        // Some deployments don't expose /models; a 404 doesn't mean the key is invalid.
        if (err?.status === 404) return { online: true, models: [] };
        return { online: false, models: [], error: err?.message ?? "NVIDIA provider is not reachable." };
      }
    },
  };
}
