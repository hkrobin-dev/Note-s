// Provider registry. Add a provider by implementing AiProvider and adding a factory here.
import { AiError, AiProvider } from "./types";
import { createOllamaProvider } from "./ollamaProvider";
import { createNvidiaProvider } from "./nvidiaProvider";

const FACTORIES: Record<string, () => AiProvider> = {
  ollama: createOllamaProvider,
  nvidia: createNvidiaProvider,
};

export type ProviderInfo = {
  id: string;
  label: string;
  embedModel: string;
  chatModel: string;
  rerankModel?: string;
  embeddingDimension: number;
  supportsRerank: boolean;
};

export function getProvider(id?: string): AiProvider {
  const key = String(id ?? process.env.AI_PROVIDER ?? "ollama").trim().toLowerCase();
  const factory = FACTORIES[key];
  if (!factory) {
    throw new AiError(`Unknown AI provider "${key}". Available: ${Object.keys(FACTORIES).join(", ")}.`, 500, "UNKNOWN_PROVIDER");
  }
  return factory();
}

export function listProviders(): ProviderInfo[] {
  return Object.entries(FACTORIES).map(([id, factory]) => {
    const p = factory();
    return {
      id,
      label: p.label,
      embedModel: p.embedModel,
      chatModel: p.chatModel,
      rerankModel: p.rerankModel,
      embeddingDimension: p.embeddingDimension,
      supportsRerank: p.supportsRerank,
    };
  });
}

export function isRerankEnabled(provider: AiProvider): boolean {
  return (
    process.env.AI_RERANK_ENABLED !== "false" &&
    provider.supportsRerank &&
    typeof provider.rerank === "function" &&
    !!provider.rerankModel
  );
}

export { AiError } from "./types";
