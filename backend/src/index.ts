import express, { json } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

import taskRoutes from "./routes/tasks";
import projectRoutes from "./routes/projects";
import noteRoutes from "./routes/notes";
import pageRoutes from "./routes/pages";
import calendarRoutes from "./routes/calendar";
import reminderRoutes from "./routes/reminders";
import routineRoutes from "./routes/routines";
import habitRoutes from "./routes/habits";
import goalRoutes from "./routes/goals";
import searchRoutes from "./routes/search";
import analyticsRoutes from "./routes/analytics";
import snippetRoutes from "./routes/snippets";
import bookmarkRoutes from "./routes/bookmarks";
import meetingRoutes from "./routes/meetings";
import timeEntryRoutes from "./routes/time-entries";
import expenseRoutes from "./routes/expenses";
import incomeRoutes from "./routes/income";
import budgetRoutes from "./routes/budgets";
import reportRoutes from "./routes/reports";
import fileRoutes from "./routes/files";
import settingsRoutes from "./routes/settings";
import notificationRoutes from "./routes/notifications";
import authRoutes from "./routes/auth";
import aiRoutes from "./routes/ai";
import { authMiddleware } from "./middleware/auth";
import { rateLimit } from "./middleware/rate-limit";
import { prisma } from "./lib/prisma";
import { runOnce } from "./services/scheduler";

const app = express();
const PORT = process.env.PORT || 4100;

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3100")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.set("trust proxy", 1);
app.use(helmet());
app.use(cookieParser());
app.use(json({ limit: "10mb" }));
app.use(
  cors({
    origin(origin, callback) {
      // Same-origin/curl requests have no Origin header.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Allow local development ports even if FRONTEND_URL is not set perfectly.
      if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return callback(null, true);
      // Not allowed: omit CORS headers so the browser blocks the response.
      return callback(null, false);
    },
    credentials: true,
  }),
);

// Broad API limit plus a tighter one for credential endpoints.
const apiLimiter = rateLimit({ windowMs: 60_000, max: 600, scope: "api" });
const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 40, scope: "auth" });

// Health. `/api/health` is an alias so the Express app can be mounted behind
// the Next.js Pages Router catch-all at `/api/*` on Vercel (single project).
app.get("/health", (_req, res) => res.json({ status: "ok", service: "my-life-os-backend" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "my-life-os-backend" }));

// Auth is enforced only when AUTH_ENFORCE=true so the demo mode keeps working.
const requireAuth: express.RequestHandler =
  process.env.AUTH_ENFORCE === "true"
    ? authMiddleware
    : (req, _res, next) => {
        (req as any).user = { id: "demo_user_001", email: "demo@local" };
        next();
      };

// Routes
app.use("/auth", authLimiter, authRoutes);
// Alias: same auth handlers are reachable under /api/* from the Next.js bridge.
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api", apiLimiter);
app.use("/api/tasks", requireAuth, taskRoutes);
app.use("/api/projects", requireAuth, projectRoutes);
app.use("/api/notes", requireAuth, noteRoutes);
app.use("/api/pages", requireAuth, pageRoutes);
app.use("/api/calendar", requireAuth, calendarRoutes);
app.use("/api/reminders", requireAuth, reminderRoutes);
app.use("/api/routines", requireAuth, routineRoutes);
app.use("/api/habits", requireAuth, habitRoutes);
app.use("/api/goals", requireAuth, goalRoutes);
app.use("/api/search", requireAuth, searchRoutes);
app.use("/api/analytics", requireAuth, analyticsRoutes);
app.use("/api/snippets", requireAuth, snippetRoutes);
app.use("/api/bookmarks", requireAuth, bookmarkRoutes);
app.use("/api/meetings", requireAuth, meetingRoutes);
app.use("/api/time-entries", requireAuth, timeEntryRoutes);
app.use("/api/expenses", requireAuth, expenseRoutes);
app.use("/api/income", requireAuth, incomeRoutes);
app.use("/api/budgets", requireAuth, budgetRoutes);
app.use("/api/reports", requireAuth, reportRoutes);
app.use("/api/files", requireAuth, fileRoutes);
app.use("/api/settings", requireAuth, settingsRoutes);
app.use("/api/notifications", requireAuth, notificationRoutes);
app.use("/api/ai", requireAuth, aiRoutes);

// Vercel Cron entry point. Vercel sends: Authorization: Bearer $CRON_SECRET
app.get("/api/cron/tick", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    await runOnce();
    res.json({ ok: true, at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

// Import-safe for serverless: only start a listener when run directly (node dist/index.js
// or tsx src/index.ts). Vercel/function runtimes import `app` and manage listening themselves.
const isDirectRun = (() => {
  if (typeof require !== "undefined" && require.main === module) return true;
  try {
    const entry = process.argv[1] ? require("node:path").resolve(process.argv[1]) : "";
    return entry === require("node:path").resolve(__filename) || /dist[\\/]index\.js$/.test(entry) || /src[\\/]index\.ts$/.test(entry);
  } catch {
    return false;
  }
})();

async function main() {
  await prisma.$connect();
  app.listen(PORT, () => {
    console.log(`My Life OS Backend listening on :${PORT}`);
  });
}

if (isDirectRun) {
  main().catch((err) => {
    console.error("Failed to start backend:", err);
    process.exit(1);
  });
}

export default app;
