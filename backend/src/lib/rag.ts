// Retrieval-Augmented Generation over the user's own Life OS data.
// Embeddings/chat come from the active provider; vectors stay in pgvector.
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import { getProvider, isRerankEnabled } from "./ai";
import { AiError, AiProvider } from "./ai/types";
import { logAiError } from "./ai/http";

export type RagDoc = {
  sourceType: string;
  sourceId: string;
  title: string;
  href: string;
  text: string;
};

export type RagSource = {
  sourceType: string;
  sourceId: string;
  title: string;
  href: string;
  snippet: string;
  similarity: number;
  rerankScore?: number;
};

type ExistingChunk = { sourceType: string; sourceId: string; contentHash: string };

type SearchRow = {
  id: string;
  sourceType: string;
  sourceId: string;
  title: string;
  href: string;
  text: string;
  similarity: number;
};

const CHUNK_SIZE = 1100;
const CHUNK_OVERLAP = 160;

/** Flatten notes/pages content: plain text, HTML, or ProseMirror/TipTap JSON. */
export function flattenContent(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return stripHtml(content);
  if (Array.isArray(content)) return content.map(flattenContent).filter(Boolean).join(" ");
  if (typeof content === "object") {
    const obj = content as Record<string, any>;
    if (typeof obj.html === "string") return stripHtml(obj.html);
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.code === "string") return obj.code;
    const parts: string[] = [];
    if (typeof obj.value === "string") parts.push(obj.value);
    if (Array.isArray(obj.content)) parts.push(flattenContent(obj.content));
    return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }
  return "";
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split long text into overlapping chunks, preferring sentence boundaries. */
export function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const window = clean.slice(start, end);
      const boundary = Math.max(window.lastIndexOf(". "), window.lastIndexOf("? "), window.lastIndexOf("! "));
      if (boundary > size * 0.5) end = start + boundary + 1;
    }
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks.filter(Boolean);
}

function dateLabel(value: unknown): string {
  if (!value) return "";
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

/** Pull all indexable records for one user into flat documents. */
export async function collectDocuments(userId: string): Promise<RagDoc[]> {
  const docs: RagDoc[] = [];

  const [pages, tasks, projects, events, meetings, goals, snippets, bookmarks, expenses] = await Promise.all([
    prisma.page.findMany({ where: { userId, archivedAt: null }, orderBy: { updatedAt: "desc" } }),
    prisma.task.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
    prisma.project.findMany({ where: { userId, archivedAt: null }, orderBy: { updatedAt: "desc" } }),
    prisma.calendarEvent.findMany({ where: { userId }, orderBy: { startAt: "desc" }, take: 1000 }),
    prisma.meeting.findMany({
      where: { userId },
      orderBy: { startAt: "desc" },
      take: 1000,
      include: { actionItems: true },
    }),
    prisma.goal.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
    prisma.snippet.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
    prisma.bookmark.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
    prisma.expense.findMany({ where: { userId }, orderBy: { expenseDate: "desc" }, take: 2000 }),
  ]);

  for (const p of pages) {
    const body = flattenContent(p.content);
    if (!body && !p.title) continue;
    docs.push({
      sourceType: "note",
      sourceId: p.id,
      title: p.title || "Untitled note",
      href: `/workspace?page=${p.id}`,
      text: `Updated ${dateLabel(p.updatedAt)}.\n${p.title}\n${body}`,
    });
  }
  for (const t of tasks) {
    docs.push({
      sourceType: "task",
      sourceId: t.id,
      title: t.title,
      href: "/tasks",
      text: `Task: ${t.title}. Status ${t.status}, priority ${t.priority}. Due ${dateLabel(t.dueDate) || "none"}. ${
        t.description || ""
      }`.trim(),
    });
  }
  for (const p of projects) {
    docs.push({
      sourceType: "project",
      sourceId: p.id,
      title: p.name,
      href: "/projects",
      text: `Project: ${p.name}. Status ${p.status}, priority ${p.priority}. Deadline ${dateLabel(p.deadline) || "none"}. ${
        p.description || ""
      }`.trim(),
    });
  }
  for (const e of events) {
    docs.push({
      sourceType: "event",
      sourceId: e.id,
      title: e.title,
      href: "/calendar",
      text: `Calendar event on ${dateLabel(e.startAt)}: ${e.title}. Location ${e.location || "none"}. ${e.description || ""} ${
        e.notes || ""
      }`.trim(),
    });
  }
  for (const m of meetings) {
    const actions = m.actionItems.map((a) => `- ${a.text}${a.dueDate ? ` (due ${dateLabel(a.dueDate)})` : ""}`).join(" ");
    docs.push({
      sourceType: "meeting",
      sourceId: m.id,
      title: m.title,
      href: "/meetings",
      text: `Meeting on ${dateLabel(m.startAt)}: ${m.title}. Attendees ${m.attendees.join(", ") || "none"}. Agenda: ${
        m.agenda || ""
      } Notes: ${m.notes || ""} Action items: ${actions}`.trim(),
    });
  }
  for (const g of goals) {
    docs.push({
      sourceType: "goal",
      sourceId: g.id,
      title: g.title,
      href: "/goals",
      text: `Goal: ${g.title}. Category ${g.category}, status ${g.status}. Progress ${g.currentValue}/${g.targetValue} ${
        g.unit || ""
      }. Due ${dateLabel(g.dueDate) || "none"}. ${g.description || ""}`.trim(),
    });
  }
  for (const s of snippets) {
    docs.push({
      sourceType: "snippet",
      sourceId: s.id,
      title: s.title,
      href: "/dev",
      text: `Code snippet (${s.language}): ${s.title}. ${s.description || ""} ${s.code}`.trim(),
    });
  }
  for (const b of bookmarks) {
    docs.push({
      sourceType: "bookmark",
      sourceId: b.id,
      title: b.title,
      href: "/dev",
      text: `Bookmark: ${b.title}. ${b.url}. Category ${b.category}. ${b.description || ""}`.trim(),
    });
  }
  for (const e of expenses) {
    docs.push({
      sourceType: "expense",
      sourceId: e.id,
      title: e.description || e.vendor || "Expense",
      href: "/expenses",
      text: `Expense on ${dateLabel(e.expenseDate)}: ${e.description || e.vendor || "Expense"} — ${e.amount} ${
        e.vendor || ""
      }`.trim(),
    });
  }

  return docs;
}

// --- Provider-aware vector storage -------------------------------------------------

/** Which column holds this provider's vectors. Never mix dimensions in one index. */
export function getVectorColumn(provider: AiProvider): "embedding" | "embeddingNvidia" {
  return provider.id === "nvidia" ? "embeddingNvidia" : "embedding";
}

export function providerFilter(provider: AiProvider): { embeddingProvider: string; embeddingModel: string } {
  return { embeddingProvider: provider.id, embeddingModel: provider.embedModel };
}

function providerKey(provider: AiProvider): string {
  return `${provider.id}|${provider.embedModel}`;
}

/** Provider/model is part of the hash: switching providers must force a re-embed. */
export function hashOf(doc: RagDoc, chunks: string[], key: string): string {
  return createHash("sha256").update(`${key}|${doc.sourceType}|${doc.sourceId}|${chunks.join("\n---\n")}`).digest("hex");
}

function assertDimension(provider: AiProvider, vector: number[]): void {
  if (!Array.isArray(vector) || vector.length !== provider.embeddingDimension) {
    throw new AiError(
      `Embedding dimension mismatch: expected ${provider.embeddingDimension}, received ${vector?.length ?? 0}. Reindex after changing the embedding model or dimension.`,
      500,
      "EMBED_DIM_MISMATCH",
    );
  }
}

export type ReindexOptions = { limit?: number; offset?: number };
export type ReindexResult = {
  sources: number;
  indexed: number;
  skipped: number;
  chunks: number;
  processed: number;
  nextOffset: number;
  totalDocs: number;
  done: boolean;
  provider: string;
  embedModel: string;
};

/**
 * Index (or refresh) documents for the active provider, one bounded batch at a
 * time so it also fits inside a serverless function invocation.
 * Existing vectors of other providers are never read, overwritten, or deleted.
 */
export async function reindexUser(userId: string, opts: ReindexOptions = {}): Promise<ReindexResult> {
  const provider = getProvider();
  const configuredBatch = Number(process.env.AI_REINDEX_BATCH || 25);
  const limit = Number.isFinite(configuredBatch)
    ? Math.min(Math.max(opts.limit ?? configuredBatch, 1), 100)
    : 25;
  const offset = Math.max(0, Math.floor(opts.offset ?? 0));
  const filter = providerFilter(provider);
  const column = getVectorColumn(provider);

  const docs = await collectDocuments(userId);
  const existing = await prisma.$queryRaw<ExistingChunk[]>`
    SELECT "sourceType", "sourceId", "contentHash" FROM "DocumentChunk"
    WHERE "userId" = ${userId}
      AND "embeddingProvider" = ${filter.embeddingProvider}
      AND "embeddingModel" = ${filter.embeddingModel}
  `;
  const existingByKey = new Map(existing.map((c) => [`${c.sourceType}|${c.sourceId}`, c.contentHash]));

  const batch = docs.slice(offset, offset + limit);
  const prepared: Array<{ doc: RagDoc; chunks: string[]; hash: string }> = [];
  let skipped = 0;
  for (const doc of batch) {
    const chunks = chunkText(doc.text);
    if (!chunks.length) continue;
    const hash = hashOf(doc, chunks, providerKey(provider));
    if (existingByKey.get(`${doc.sourceType}|${doc.sourceId}`) === hash) {
      skipped++;
      continue;
    }
    prepared.push({ doc, chunks, hash });
  }

  // Only touch chunks belonging to the active provider. Deleted/archived sources
  // are removed; sources refreshed in this batch are replaced below.
  const keep = new Set(docs.map((d) => `${d.sourceType}|${d.sourceId}`));
  const refresh = new Set(prepared.map((p) => `${p.doc.sourceType}|${p.doc.sourceId}`));
  const toDelete = new Map<string, { sourceType: string; sourceId: string }>();
  for (const c of existing) {
    const key = `${c.sourceType}|${c.sourceId}`;
    if (!keep.has(key) || refresh.has(key)) {
      toDelete.set(key, { sourceType: c.sourceType, sourceId: c.sourceId });
    }
  }
  const allChunks = prepared.flatMap((p) => p.chunks);
  let vectors: number[][] = [];
  if (allChunks.length) {
    vectors = await provider.embedTexts(allChunks, "passage");
    for (const vector of vectors) assertDimension(provider, vector);
  }

  // Delete only AFTER new vectors are generated successfully: if the embedding
  // call fails, the previous vectors for this provider remain intact.
  for (const target of toDelete.values()) {
    await prisma.$executeRaw`
      DELETE FROM "DocumentChunk"
      WHERE "userId" = ${userId} AND "sourceType" = ${target.sourceType} AND "sourceId" = ${target.sourceId}
        AND "embeddingProvider" = ${filter.embeddingProvider} AND "embeddingModel" = ${filter.embeddingModel}
    `;
  }

  let cursor = 0;
  for (const item of prepared) {
    for (let i = 0; i < item.chunks.length; i++) {
      const vector = vectors[cursor++];
      if (!vector) continue;
      const literal = JSON.stringify(vector);
      if (column === "embeddingNvidia") {
        await prisma.$executeRaw`
          INSERT INTO "DocumentChunk"
            ("id", "userId", "sourceType", "sourceId", "title", "href", "chunkIndex", "text", "contentHash", "embedding", "embeddingNvidia", "embeddingProvider", "embeddingModel", "createdAt", "updatedAt")
          VALUES (
            ${randomUUID()}, ${userId}, ${item.doc.sourceType}, ${item.doc.sourceId}, ${item.doc.title}, ${item.doc.href},
            ${i}, ${item.chunks[i]}, ${item.hash}, NULL, ${literal}::vector,
            ${filter.embeddingProvider}, ${filter.embeddingModel}, NOW(), NOW()
          )
        `;
      } else {
        await prisma.$executeRaw`
          INSERT INTO "DocumentChunk"
            ("id", "userId", "sourceType", "sourceId", "title", "href", "chunkIndex", "text", "contentHash", "embedding", "embeddingNvidia", "embeddingProvider", "embeddingModel", "createdAt", "updatedAt")
          VALUES (
            ${randomUUID()}, ${userId}, ${item.doc.sourceType}, ${item.doc.sourceId}, ${item.doc.title}, ${item.doc.href},
            ${i}, ${item.chunks[i]}, ${item.hash}, ${literal}::vector, NULL,
            ${filter.embeddingProvider}, ${filter.embeddingModel}, NOW(), NOW()
          )
        `;
      }
    }
  }

  const nextOffset = offset + batch.length;
  return {
    sources: docs.length,
    indexed: prepared.length,
    skipped,
    chunks: await countChunks(userId, provider),
    processed: batch.length,
    nextOffset,
    totalDocs: docs.length,
    done: nextOffset >= docs.length,
    provider: provider.id,
    embedModel: provider.embedModel,
  };
}

export async function countChunks(userId?: string, provider?: AiProvider): Promise<number> {
  if (provider) {
    const filter = providerFilter(provider);
    const rows = userId
      ? await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count FROM "DocumentChunk"
          WHERE "userId" = ${userId} AND "embeddingProvider" = ${filter.embeddingProvider} AND "embeddingModel" = ${filter.embeddingModel}
        `
      : await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count FROM "DocumentChunk"
          WHERE "embeddingProvider" = ${filter.embeddingProvider} AND "embeddingModel" = ${filter.embeddingModel}
        `;
    return Number(rows[0]?.count ?? 0);
  }
  const rows = userId
    ? await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM "DocumentChunk" WHERE "userId" = ${userId}
      `
    : await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "DocumentChunk"`;
  return Number(rows[0]?.count ?? 0);
}

async function search(userId: string, vector: number[], topK: number, provider: AiProvider): Promise<SearchRow[]> {
  const literal = JSON.stringify(vector);
  const filter = providerFilter(provider);
  if (getVectorColumn(provider) === "embeddingNvidia") {
    return prisma.$queryRaw<SearchRow[]>`
      SELECT "id", "sourceType", "sourceId", "title", "href", "text",
             1 - ("embeddingNvidia" <=> ${literal}::vector) AS "similarity"
      FROM "DocumentChunk"
      WHERE "userId" = ${userId}
        AND "embeddingProvider" = ${filter.embeddingProvider}
        AND "embeddingModel" = ${filter.embeddingModel}
        AND "embeddingNvidia" IS NOT NULL
      ORDER BY "embeddingNvidia" <=> ${literal}::vector
      LIMIT ${topK}
    `;
  }
  return prisma.$queryRaw<SearchRow[]>`
    SELECT "id", "sourceType", "sourceId", "title", "href", "text",
           1 - ("embedding" <=> ${literal}::vector) AS "similarity"
    FROM "DocumentChunk"
    WHERE "userId" = ${userId}
      AND "embeddingProvider" = ${filter.embeddingProvider}
      AND "embeddingModel" = ${filter.embeddingModel}
      AND "embedding" IS NOT NULL
    ORDER BY "embedding" <=> ${literal}::vector
    LIMIT ${topK}
  `;
}

/** Reorder retrieved rows using raw reranker logits (higher is better). */
export function rankRowsByScores<T>(rows: T[], scores: number[]): T[] {
  return rows
    .map((row, i) => ({ row, score: Number.isFinite(scores[i]) ? scores[i] : Number.NEGATIVE_INFINITY }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.row);
}

/** Embed a question, retrieve relevant chunks, optionally rerank, then answer. */
export async function answerQuestion(userId: string, question: string, topK = 6, provider = getProvider()): Promise<{
  answer: string;
  sources: RagSource[];
  model: string;
  chunksUsed: number;
  provider: string;
  embedModel: string;
  rerankModel?: string;
  rerankUsed: boolean;
}> {
  const limit = Math.min(Math.max(Math.floor(topK), 1), 20);
  const vector = await provider.embedOne(question, "query");
  assertDimension(provider, vector);

  const useRerank = isRerankEnabled(provider) && typeof provider.rerank === "function";
  const candidateK = useRerank ? Math.min(limit * 3, 20) : limit;
  const rows = await search(userId, vector, candidateK, provider);

  if (!rows.length) {
    return {
      answer: "I don't have any indexed data for this provider yet. Click **Reindex** to build your private index, then ask again.",
      sources: [],
      model: provider.chatModel,
      chunksUsed: 0,
      provider: provider.id,
      embedModel: provider.embedModel,
      rerankModel: provider.rerankModel,
      rerankUsed: false,
    };
  }

  let finalRows = rows.slice(0, limit);
  let rerankScores: number[] | undefined;
  let rerankUsed = false;
  if (useRerank && provider.rerank) {
    try {
      rerankScores = await provider.rerank(question, rows.map((r) => r.text.slice(0, 1600)));
      finalRows = rankRowsByScores(rows, rerankScores).slice(0, limit);
      rerankUsed = true;
    } catch (err) {
      // Rerank is an enhancement: fall back to vector order rather than fail the answer.
      logAiError("rerank", err);
      rerankScores = undefined;
      finalRows = rows.slice(0, limit);
    }
  }

  const context = finalRows
    .map((row, i) => {
      const label = row.sourceType.charAt(0).toUpperCase() + row.sourceType.slice(1);
      return `[${i + 1}] (${label}: ${row.title}, ${row.href})\n${row.text.slice(0, 1600)}`;
    })
    .join("\n\n");

  const system = [
    "You are 'Ask your life', a private assistant for the owner of My Life OS.",
    "Answer the question using ONLY the numbered CONTEXT below. Be concise and practical.",
    "Cite the numbers of the sources you used, e.g. [1], [2]. Never invent facts or dates.",
    "If the context does not contain the answer, say: \"I couldn't find that in your indexed data.\"",
    "",
    "CONTEXT:",
    context,
  ].join("\n");

  const answer = await provider.chat(
    [
      { role: "system", content: system },
      { role: "user", content: question },
    ],
    0.2,
  );

  const sources: RagSource[] = finalRows.map((row, i) => {
    const original = rows.indexOf(row);
    const score = rerankScores && Number.isFinite(rerankScores[original]) ? rerankScores[original] : undefined;
    return {
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      title: row.title,
      href: row.href,
      snippet: row.text.slice(0, 240),
      similarity: Math.round(Number(row.similarity) * 1000) / 1000,
      rerankScore: score === undefined ? undefined : Math.round(score * 1000) / 1000,
    };
  });

  return {
    answer,
    sources,
    model: provider.chatModel,
    chunksUsed: sources.length,
    provider: provider.id,
    embedModel: provider.embedModel,
    rerankModel: provider.rerankModel,
    rerankUsed,
  };
}
