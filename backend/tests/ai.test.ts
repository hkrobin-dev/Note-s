// Targeted provider/RAG tests. No network or database required: fetch is mocked.
import test from "node:test";
import assert from "node:assert/strict";
import { createNvidiaProvider } from "../src/lib/ai/nvidiaProvider";
import { callApi, logAiError, safeErrorMessage } from "../src/lib/ai/http";
import { AiError, type AiProvider } from "../src/lib/ai/types";
import { getProvider, isRerankEnabled } from "../src/lib/ai";
import { getVectorColumn, hashOf, providerFilter, rankRowsByScores, type RagDoc } from "../src/lib/rag";

const ORIGINAL_FETCH = globalThis.fetch;
const ENV_KEYS = [
  "NVIDIA_API_KEY", "NVIDIA_BASE_URL", "NVIDIA_CHAT_MODEL", "NVIDIA_EMBED_MODEL",
  "NVIDIA_RERANK_MODEL", "NVIDIA_RERANK_BASE_URL", "NVIDIA_EMBED_DIM", "AI_PROVIDER", "AI_RERANK_ENABLED",
];
const originalEnv = new Map(ENV_KEYS.map((k) => [k, process.env[k]]));

function restore() {
  globalThis.fetch = ORIGINAL_FETCH;
  for (const [k, v] of originalEnv) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function mockFetch(impl: (url: string, init: any) => Promise<Response>): Array<{ url: string; init: any }> {
  const calls: Array<{ url: string; init: any }> = [];
  globalThis.fetch = (async (input: any, init: any) => {
    calls.push({ url: String(input), init });
    return impl(String(input), init);
  }) as typeof fetch;
  return calls;
}

test.beforeEach(() => {
  process.env.NVIDIA_API_KEY = "test-key";
  process.env.NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
  process.env.NVIDIA_CHAT_MODEL = "nvidia/nemotron-3.5-bolt-e4b";
  process.env.NVIDIA_EMBED_MODEL = "nvidia/nemotron-3.5-embed-1b";
  process.env.NVIDIA_RERANK_MODEL = "nvidia/nemotron-3.5-rerank-8b";
  delete process.env.NVIDIA_RERANK_BASE_URL;
  delete process.env.NVIDIA_EMBED_DIM;
  process.env.AI_RERANK_ENABLED = "true";
});

test.afterEach(restore);

test("NVIDIA embeddings send passage input_type, model and key to /v1/embeddings", async () => {
  const calls = mockFetch(async () => jsonResponse({
    data: [
      { index: 1, embedding: Array(2048).fill(0.2) },
      { index: 0, embedding: Array(2048).fill(0.1) },
    ],
  }));
  const vectors = await createNvidiaProvider().embedTexts(["first", "second"], "passage");

  assert.equal(vectors.length, 2);
  assert.equal(vectors[0][0], 0.1, "rows must be restored to request order via index");
  assert.equal(calls[0].url, "https://integrate.api.nvidia.com/v1/embeddings");
  assert.equal(calls[0].init.headers.Authorization, "Bearer test-key");
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.input_type, "passage");
  assert.deepEqual(body.input, ["first", "second"]);
  assert.equal(body.model, "nvidia/nemotron-3.5-embed-1b");
});

test("query embeddings use input_type=query", async () => {
  const calls = mockFetch(async () => jsonResponse({ data: [{ index: 0, embedding: Array(2048).fill(0) }] }));
  await createNvidiaProvider().embedOne("what did I decide?", "query");
  assert.equal(JSON.parse(calls[0].init.body).input_type, "query");
});

test("chat uses OpenAI-compatible endpoint and returns trimmed content", async () => {
  const calls = mockFetch(async () => jsonResponse({ choices: [{ message: { content: "  grounded answer  " } }] }));
  const answer = await createNvidiaProvider().chat([{ role: "user", content: "hi" }], 0.3);
  assert.equal(answer, "grounded answer");
  assert.equal(calls[0].url, "https://integrate.api.nvidia.com/v1/chat/completions");
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.model, "nvidia/nemotron-3.5-bolt-e4b");
  assert.equal(body.temperature, 0.3);
  assert.equal(body.stream, false);
});

test("rerank maps hosted rankings back to passage indexes", async () => {
  const calls = mockFetch(async () => jsonResponse({
    rankings: [{ index: 1, logit: 4.5 }, { index: 0, logit: 0.2 }],
  }));
  const scores = await createNvidiaProvider().rerank!("question", ["passage a", "passage b"]);
  assert.deepEqual(scores, [0.2, 4.5]);
  assert.equal(
    calls[0].url,
    "https://ai.api.nvidia.com/v1/retrieval/nvidia/nemotron-3.5-rerank-8b/reranking",
  );
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(body.query, { text: "question" });
  assert.deepEqual(body.passages, [{ text: "passage a" }, { text: "passage b" }]);
});

test("wrong embedding dimension is rejected before any DB write", async () => {
  mockFetch(async () => jsonResponse({ data: [{ index: 0, embedding: Array(768).fill(0) }] }));
  await assert.rejects(
    () => createNvidiaProvider().embedOne("x", "passage"),
    (err: any) => err instanceof AiError && err.code === "EMBED_DIM_MISMATCH",
  );
});

test("missing API key never leaves the backend", async () => {
  delete process.env.NVIDIA_API_KEY;
  await assert.rejects(
    () => createNvidiaProvider().chat([{ role: "user", content: "secret question" }]),
    (err: any) => err instanceof AiError && err.code === "NVIDIA_KEY_MISSING",
  );
});

test("429 with Retry-After is retried, other errors are not", async () => {
  let count = 0;
  const calls = mockFetch(async () => {
    count++;
    return count === 1
      ? jsonResponse({ error: "slow down" }, 429, { "retry-after": "0" })
      : jsonResponse({ ok: true });
  });
  await callApi("https://example.test", { retries: 2 });
  assert.equal(calls.length, 2);

  count = 0;
  const calls2 = mockFetch(async () => { count++; return jsonResponse({}, 401); });
  await assert.rejects(() => callApi("https://example.test", { retries: 2 }), AiError);
  assert.equal(calls2.length, 1, "auth errors must not be retried");
});

test("errors and logs never echo private text or API keys", () => {
  const message = safeErrorMessage(400, { error: { message: "my private note text", code: "BAD" } });
  assert.ok(!message.includes("my private note text"));

  const original = console.error;
  const lines: string[] = [];
  console.error = (...args: any[]) => lines.push(JSON.stringify(args));
  try {
    logAiError("test", Object.assign(new Error("my private note text"), { name: "secret-key-name" }));
  } finally {
    console.error = original;
  }
  assert.ok(!lines.join(" ").includes("secret-key-name"));
  assert.ok(!lines.join(" ").includes("my private note text"));
});

test("provider switching changes content hash and vector column/filter", () => {
  const doc: RagDoc = { sourceType: "note", sourceId: "n1", title: "T", href: "/h", text: "body" };
  assert.notEqual(hashOf(doc, ["body"], "ollama|nomic-embed-text"), hashOf(doc, ["body"], "nvidia|nemotron"));

  const nvidia = createNvidiaProvider();
  const ollama = getProvider("ollama");
  assert.equal(getVectorColumn(nvidia), "embeddingNvidia");
  assert.equal(getVectorColumn(ollama), "embedding");
  assert.deepEqual(providerFilter(nvidia), { embeddingProvider: "nvidia", embeddingModel: "nvidia/nemotron-3.5-embed-1b" });
});

test("rerank toggle and provider registry", () => {
  assert.equal(getProvider("nvidia").id, "nvidia");
  assert.throws(() => getProvider("unknown-provider"), AiError);

  const nvidia = createNvidiaProvider() as AiProvider;
  assert.equal(isRerankEnabled(nvidia), true);
  process.env.AI_RERANK_ENABLED = "false";
  assert.equal(isRerankEnabled(nvidia), false);
  assert.equal(isRerankEnabled(getProvider("ollama")), false);
});

test("rankRowsByScores reorders by descending logit", () => {
  assert.deepEqual(rankRowsByScores(["a", "b", "c"], [1, 3, 2]), ["b", "c", "a"]);
});
