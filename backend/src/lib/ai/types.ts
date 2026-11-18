// Common contract for all AI providers (Ollama, NVIDIA NIM, future providers).
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** Nemotron Embed requires different prefixes for indexing vs. querying. */
export type EmbedInputType = "passage" | "query";

export type ProviderStatus = {
  online: boolean;
  models: string[];
  error?: string;
};

export type AiProvider = {
  id: string;
  label: string;
  embedModel: string;
  chatModel: string;
  rerankModel?: string;
  embeddingDimension: number;
  supportsRerank: boolean;
  embedTexts(texts: string[], inputType: EmbedInputType): Promise<number[][]>;
  embedOne(text: string, inputType: EmbedInputType): Promise<number[]>;
  chat(messages: ChatMessage[], temperature?: number): Promise<string>;
  rerank?(query: string, passages: string[]): Promise<number[]>;
  status(): Promise<ProviderStatus>;
};

export class AiError extends Error {
  constructor(message: string, readonly status?: number, readonly code?: string) {
    super(message);
    this.name = "AiError";
  }
}

export function isAiError(err: unknown): err is AiError {
  return err instanceof AiError;
}
