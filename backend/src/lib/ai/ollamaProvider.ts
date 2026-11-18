// Ollama provider — wraps the existing local client without changing its behavior.
import {
  chat as ollamaChat,
  embedOne as ollamaEmbedOne,
  embedTexts as ollamaEmbedTexts,
  ollamaStatus,
  EMBED_MODEL,
  CHAT_MODEL,
  OllamaError,
} from "../ollama";
import { AiError, AiProvider, ChatMessage, EmbedInputType } from "./types";

function fromOllama(err: unknown): never {
  if (err instanceof OllamaError) throw new AiError(err.message, err.status ?? 503, "OLLAMA");
  throw err;
}

export function createOllamaProvider(): AiProvider {
  const dim = Number(process.env.OLLAMA_EMBED_DIM || 768);
  return {
    id: "ollama",
    label: "Ollama (local)",
    embedModel: EMBED_MODEL,
    chatModel: CHAT_MODEL,
    embeddingDimension: Number.isFinite(dim) && dim > 0 ? dim : 768,
    supportsRerank: false,

    async embedTexts(texts: string[], _inputType: EmbedInputType): Promise<number[][]> {
      try { return await ollamaEmbedTexts(texts); } catch (err) { return fromOllama(err); }
    },
    async embedOne(text: string, _inputType: EmbedInputType): Promise<number[]> {
      try { return await ollamaEmbedOne(text); } catch (err) { return fromOllama(err); }
    },
    async chat(messages: ChatMessage[], temperature = 0.2): Promise<string> {
      try { return await ollamaChat(messages, temperature); } catch (err) { return fromOllama(err); }
    },
    async status() {
      const s = await ollamaStatus();
      return { online: s.online, models: s.models, error: s.error };
    },
  };
}
