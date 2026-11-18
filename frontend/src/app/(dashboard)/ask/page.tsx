"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";
import { useToast } from "@/components/toast/toaster";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, Bot, ExternalLink, Loader2, RefreshCw, Send, Sparkles,
} from "lucide-react";

type Source = {
  sourceType: string;
  sourceId: string;
  title: string;
  href: string;
  snippet: string;
  similarity: number;
  rerankScore?: number;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  failed?: boolean;
};

type AiStatus = {
  online: boolean;
  models: string[];
  indexedChunks: number;
  provider: string;
  providerLabel: string;
  providerChunks?: number;
  embedModel: string;
  chatModel: string;
  rerankModel?: string;
  rerankEnabled?: boolean;
  embeddingDimension?: number;
  error?: string;
};

const STARTERS = [
  "What did I decide about my main project last month?",
  "Summarise my open tasks and deadlines.",
  "What are my goals and how far along are they?",
  "Where did my money go this month?",
];

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function AskPage() {
  const { toast } = useToast();
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadStatus = useCallback(async () => {
    try {
      setStatus((await api.ai.status()) as AiStatus);
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function reindex() {
    setReindexing(true);
    try {
      // Batches keep each backend call bounded (also safe on serverless hosts).
      let offset = 0;
      let total = 0;
      let skipped = 0;
      let chunks = 0;
      let guard = 0;
      for (;;) {
        const result = await api.ai.reindex({ offset });
        total = result.totalDocs ?? result.sources ?? 0;
        skipped += result.skipped ?? 0;
        chunks = result.chunks ?? chunks;
        if (result.done || !result.nextOffset || result.nextOffset <= offset || ++guard > 500) break;
        offset = result.nextOffset;
      }
      toast({
        title: "Private index ready",
        description: `${chunks} indexed chunks · ${total} records${skipped ? ` · ${skipped} unchanged` : ""}.`,
      });
      await loadStatus();
    } catch (err: any) {
      toast({ title: "Reindex failed", description: err?.message ?? "Check the AI provider configuration." });
    } finally {
      setReindexing(false);
    }
  }

  async function send(text: string) {
    const question = text.trim();
    if (question.length < 2 || busy) return;
    setInput("");
    setMessages((list) => [...list, { id: newId(), role: "user", content: question }]);
    setBusy(true);
    try {
      const result = await api.ai.ask(question);
      setMessages((list) => [
        ...list,
        {
          id: newId(),
          role: "assistant",
          content: result.answer || "No answer returned.",
          sources: result.sources ?? [],
        },
      ]);
    } catch (err: any) {
      const message = err?.message ?? "Something went wrong.";
      setMessages((list) => [...list, { id: newId(), role: "assistant", content: message, failed: true }]);
      toast({ title: "Could not answer", description: message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 p-4 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="" width={639} height={510} className="size-10 shrink-0 object-contain" />
          <h1 className="text-2xl font-bold text-ink">Ask your life</h1>
          <p className="mt-1 text-xs text-ink-3">
            RAG over your notes, tasks, events and goals — answered by the AI provider configured on the backend.
          </p>
        </div>
        <span className="accent-pill self-start">
          <Sparkles size={13} /> {status?.provider === "nvidia" ? "NVIDIA NIM" : status ? "Ollama · local" : "AI"}
        </span>
      </div>

      {/* Engine status */}
      <div className="panel flex flex-wrap items-center gap-3 px-4 py-3.5">
        <div
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            status?.online ? "bg-positive/10 text-positive" : "bg-warning/10 text-warning",
          )}
        >
          {status?.online ? <Bot size={18} /> : <AlertTriangle size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink">
            {status?.online
              ? `${status.providerLabel ?? status.provider} is online`
              : status
                ? `${status.providerLabel ?? status.provider} is not reachable`
                : "Checking AI provider…"}
          </div>
          <div className="truncate text-xs text-ink-3">
            {status?.online
              ? `${status.embedModel} · ${status.chatModel}${status.rerankEnabled && status.rerankModel ? ` · ${status.rerankModel}` : ""} · ${status.providerChunks ?? status.indexedChunks} indexed chunks`
              : status?.error ?? "Configure the AI provider on the backend to enable answers."}
          </div>
          {status?.online && (
            <div className="mt-0.5 text-[11px] text-ink-3">
              Embeddings: {status.embedModel} ({status.embeddingDimension ?? "—"}d) · switch provider via backend
              <code className="mx-1 rounded bg-surface-2 px-1 py-0.5">AI_PROVIDER</code>
              then reindex.
            </div>
          )}
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={reindex}
          disabled={reindexing || !status?.online}
          title="Embed any new or changed records"
        >
          {reindexing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          {reindexing ? "Indexing…" : "Reindex"}
        </button>
      </div>

      {/* Conversation */}
      <div className="panel flex min-h-[55vh] flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6" style={{ maxHeight: "60vh" }}>
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
                <Sparkles size={22} />
              </div>
              <h2 className="mt-4 text-base font-semibold text-ink">What would you like to know?</h2>
              <p className="mt-1 max-w-md text-xs text-ink-3">
                Answers come only from data already in My Life OS. With Ollama everything stays local; with NVIDIA NIM,
                your indexed content is sent to NVIDIA for embedding and answering.
              </p>
              <div className="mt-5 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                {STARTERS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    disabled={busy || !status?.online}
                    className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-left text-xs text-ink-2 transition-colors hover:border-accent hover:text-ink disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={cn("flex gap-3", m.role === "user" && "justify-end")}>
                {m.role === "assistant" && (
                  <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                    <Sparkles size={16} />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-relaxed",
                    m.role === "user"
                      ? "border-accent bg-accent text-accent-ink"
                      : m.failed
                        ? "border-error/25 bg-error/10 text-error"
                        : "border-line bg-surface-2 text-ink-2",
                  )}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  {!!m.sources?.length && (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                      {m.sources.map((s, i) => (
                        <Link
                          key={`${s.sourceType}-${s.sourceId}-${i}`}
                          href={s.href}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-medium text-ink-2 transition-colors hover:border-accent hover:text-accent"
                          title={s.snippet}
                        >
                          <span className="text-[10px] uppercase tracking-wide text-ink-3">{s.sourceType}</span>
                          <span className="max-w-[150px] truncate">{s.title}</span>
                          <ExternalLink size={11} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {busy && (
            <div className="flex items-center gap-3 text-xs text-ink-3">
              <Loader2 size={15} className="animate-spin text-accent" /> Thinking…
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          className="border-t border-line bg-surface/60 p-3 md:p-4"
          onSubmit={(e) => { e.preventDefault(); void send(input); }}
        >
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={2}
              placeholder="Ask anything about your notes, tasks, expenses…"
              className="input-glass max-h-40 resize-y"
              disabled={!status?.online}
            />
            <button type="submit" className="btn-primary h-[42px] shrink-0" disabled={busy || input.trim().length < 2}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              <span className="hidden sm:inline">Ask</span>
            </button>
          </div>
          <p className="mt-2 text-[11px] text-ink-3">
            Answers are grounded in your indexed records and include links back to the source. Press Enter to send, Shift+Enter for a new line.
          </p>
        </form>
      </div>
    </div>
  );
}
