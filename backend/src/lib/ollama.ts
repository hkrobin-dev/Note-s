// Local AI via Ollama. No data leaves the machine.
import { setTimeout as delay } from "node:timers/promises";

const BASE_URL = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "");
export const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";
export const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || "qwen2.5:3b";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class OllamaError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "OllamaError";
  }
}

async function callOllama<T = any>(path: string, body: unknown, timeoutMs = 120_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* handled below */ }
    if (!res.ok) {
      throw new OllamaError(data?.error || `Ollama returned ${res.status} for ${path}`, res.status);
    }
    return data as T;
  } catch (err: any) {
    if (err instanceof OllamaError) throw err;
    if (err?.name === "AbortError") {
      throw new OllamaError(`Ollama timed out after ${Math.round(timeoutMs / 1000)}s. Try a smaller model or fewer documents.`);
    }
    throw new OllamaError(
      `Cannot reach Ollama at ${BASE_URL}. Start it with "ollama serve" and pull the models (see docs/AI_SETUP.md).`,
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Embed texts locally. Uses /api/embed (Ollama >= 0.12) with a legacy fallback. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const result: number[][] = [];
  for (let i = 0; i < texts.length; i += 16) {
    const batch = texts.slice(i, i + 16);
    let vectors: number[][] | undefined;
    try {
      const data = await callOllama<{ embeddings?: number[][] }>("/api/embed", {
        model: EMBED_MODEL,
        input: batch,
      });
      if (Array.isArray(data?.embeddings)) vectors = data.embeddings;
    } catch (err) {
      if (!(err instanceof OllamaError && err.status === 404)) throw err;
    }
    if (!vectors) {
      // Older Ollama: one request per input.
      const legacy: number[][] = [];
      for (const text of batch) {
        const data = await callOllama<{ embedding?: number[] }>("/api/embeddings", {
          model: EMBED_MODEL,
          prompt: text,
        });
        if (!Array.isArray(data?.embedding)) {
          throw new OllamaError(`Ollama did not return an embedding for model "${EMBED_MODEL}".`);
        }
        legacy.push(data.embedding);
      }
      vectors = legacy;
    }
    if (vectors.length !== batch.length) {
      throw new OllamaError("Ollama returned an unexpected number of embeddings.");
    }
    result.push(...vectors);
    if (i + 16 < texts.length) await delay(25); // be gentle on CPU
  }
  return result;
}

export async function embedOne(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  if (!vector) throw new OllamaError("Ollama returned no embedding.");
  return vector;
}

export async function chat(messages: ChatMessage[], temperature = 0.2): Promise<string> {
  const data = await callOllama<{ message?: { content?: string } }>("/api/chat", {
    model: CHAT_MODEL,
    messages,
    stream: false,
    options: { temperature },
  });
  const content = data?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new OllamaError(`No answer returned by "${CHAT_MODEL}".`);
  }
  return content.trim();
}

export async function ollamaStatus(): Promise<{
  online: boolean;
  models: string[];
  embedModel: string;
  chatModel: string;
  error?: string;
}> {
  const base = {
    embedModel: EMBED_MODEL,
    chatModel: CHAT_MODEL,
    models: [] as string[],
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${BASE_URL}/api/tags`, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: any = await res.json();
    const models: string[] = (data?.models ?? []).map((m: any) => String(m.name ?? m.model ?? ""));
    return {
      ...base,
      online: true,
      models,
    };
  } catch {
    return {
      ...base,
      online: false,
      error: `Ollama is not reachable at ${BASE_URL}. Run "ollama serve" and pull ${EMBED_MODEL} + ${CHAT_MODEL}.`,
    };
  } finally {
    clearTimeout(timer);
  }
}
