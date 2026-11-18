import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getProvider, listProviders, AiError } from "../lib/ai";
import { answerQuestion, countChunks, reindexUser } from "../lib/rag";
import { rateLimit } from "../middleware/rate-limit";

const router = Router();
const DEMO_USER_ID = "demo_user_001";
const userIdOf = (req: any) => req?.user?.id ?? DEMO_USER_ID;

// Generative calls cost money/rate-limit upstream; keep these tighter than general API limits.
const askLimit = rateLimit({ windowMs: 60_000, max: 20, scope: "ai-ask" });
const reindexLimit = rateLimit({ windowMs: 60_000, max: 10, scope: "ai-reindex" });

function safeError(err: unknown): { status: number; error: string } {
  if (err instanceof AiError) return { status: err.status ?? 502, error: err.message };
  const message = err instanceof Error ? err.message : "";
  if (message.includes("DATABASE_URL") || message.includes("ECONNREFUSED")) {
    return { status: 503, error: "Database is not available." };
  }
  return { status: 502, error: "AI request failed. Check provider configuration and try again." };
}

router.get("/status", async (_req, res) => {
  try {
    const provider = getProvider();
    const status = await provider.status();
    res.json({
      ...status,
      provider: provider.id,
      providerLabel: provider.label,
      embedModel: provider.embedModel,
      chatModel: provider.chatModel,
      rerankModel: provider.rerankModel,
      rerankEnabled: process.env.AI_RERANK_ENABLED !== "false" && provider.supportsRerank,
      embeddingDimension: provider.embeddingDimension,
      providers: listProviders(),
      indexedChunks: await countChunks().catch(() => 0),
      providerChunks: await countChunks(undefined, provider).catch(() => 0),
    });
  } catch (err) {
    const { status, error } = safeError(err);
    res.status(status).json({ online: false, models: [], indexedChunks: 0, error });
  }
});

router.post("/ask", askLimit, async (req, res) => {
  const parsed = z
    .object({
      question: z.string().trim().min(2).max(2000),
      topK: z.number().int().min(1).max(20).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please provide a question (2-2000 characters)." });

  try {
    const result = await answerQuestion(userIdOf(req), parsed.data.question, parsed.data.topK ?? 6);
    res.json({ ...result, embedModel: result.embedModel, chatModel: result.model });
  } catch (err) {
    const { status, error } = safeError(err);
    res.status(status).json({ error });
  }
});

router.post("/reindex", reindexLimit, async (req, res) => {
  const parsed = z
    .object({
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
    })
    .safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "Invalid reindex options." });

  try {
    const result = await reindexUser(userIdOf(req), parsed.data);
    res.json(result);
  } catch (err) {
    const { status, error } = safeError(err);
    res.status(status).json({ error });
  }
});

router.get("/chunks", async (req, res) => {
  try {
    const rows = await prisma.$queryRaw<Array<{ sourceType: string; count: bigint }>>`
      SELECT "sourceType", COUNT(*)::bigint AS count FROM "DocumentChunk"
      WHERE "userId" = ${userIdOf(req)}
      GROUP BY "sourceType" ORDER BY "sourceType"
    `;
    res.json({ chunks: rows.map((r) => ({ sourceType: r.sourceType, count: Number(r.count) })) });
  } catch {
    res.status(503).json({ error: "Database is not available." });
  }
});

export default router;
