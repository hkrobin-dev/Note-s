// Shared HTTP helper for remote AI providers.
// Rules: bounded timeouts, bounded retries, sanitized errors, no body/key logging.
import { setTimeout as delay } from "node:timers/promises";
import { AiError } from "./types";

const timeoutMs = () => {
  const n = Number(process.env.AI_REQUEST_TIMEOUT_MS || 60_000);
  return Number.isFinite(n) && n >= 1000 ? n : 60_000;
};
const maxRetries = () => {
  const n = Number(process.env.AI_MAX_RETRIES || 2);
  return Number.isFinite(n) && n >= 0 && n <= 5 ? Math.floor(n) : 2;
};

type CallOptions = {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
};

/** Error messages are intentionally generic: provider error bodies can echo private input. */
export function safeErrorMessage(status: number, data?: any): string {
  switch (status) {
    case 400: return "AI provider rejected the request (invalid input).";
    case 401:
    case 403: return "AI provider authentication failed. Check the API key.";
    case 404: return "AI provider model or endpoint not found. Check model configuration.";
    case 422: return "AI provider could not process the request (validation failed).";
    case 429: return "AI provider rate limit reached. Try again shortly.";
    default:
      if (status >= 500) return `AI provider error (HTTP ${status}).`;
      const code = data?.error?.code ?? data?.code;
      return code ? `AI provider request failed (${String(code).slice(0, 40)}).` : `AI provider request failed (HTTP ${status}).`;
  }
}

const SAFE_ERROR_NAMES = new Set(["Error", "AiError", "OllamaError", "TypeError", "AbortError", "FetchError"]);

/** Log only whitelisted metadata. Never log API keys, questions, document text, or response bodies. */
export function logAiError(scope: string, err: unknown): void {
  const e = err as any;
  const safeCode = typeof e?.code === "string" && /^[A-Z0-9_]{1,60}$/i.test(e.code) ? e.code : undefined;
  console.error("[ai]", {
    scope,
    name: typeof e?.name === "string" && SAFE_ERROR_NAMES.has(e.name) ? e.name : "Error",
    status: typeof e?.status === "number" ? e.status : undefined,
    code: safeCode,
    // Only AiError messages are sanitized; all other messages may echo private input.
    message: err instanceof AiError ? err.message.slice(0, 200) : "non-provider error",
  });
}

function retryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.min(Math.max(seconds * 1000, 0), 10_000);
  const at = new Date(header).getTime();
  if (Number.isFinite(at)) return Math.min(Math.max(at - Date.now(), 0), 10_000);
  return undefined;
}

export async function callApi<T>(url: string, opts: CallOptions = {}): Promise<T> {
  const limit = opts.timeoutMs ?? timeoutMs();
  const retries = opts.retries ?? maxRetries();

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), limit);
    try {
      const res = await fetch(url, {
        method: opts.method ?? "GET",
        headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: controller.signal,
      });
      const text = await res.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON handled below */ }

      if (res.ok) return data as T;

      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === retries) {
        throw new AiError(safeErrorMessage(res.status, data), res.status, `HTTP_${res.status}`);
      }
      const wait = retryAfterMs(res.headers.get("retry-after")) ?? Math.min(500 * 2 ** attempt, 4_000);
      await delay(wait);
    } catch (err) {
      if (err instanceof AiError) throw err;
      const aborted = (err as any)?.name === "AbortError";
      if (attempt === retries) {
        throw new AiError(
          aborted ? `AI provider timed out after ${Math.round(limit / 1000)}s.` : "Cannot reach AI provider. Check network/provider configuration.",
          aborted ? 504 : 503,
          aborted ? "TIMEOUT" : "NETWORK",
        );
      }
      await delay(Math.min(500 * 2 ** attempt, 4_000));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new AiError("AI provider request failed.", 503, "FAILED");
}
