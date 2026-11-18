import type { Request, Response, NextFunction } from "express";

type Options = {
  windowMs: number;
  max: number;
  /** Label used in the error message, e.g. "auth". */
  scope?: string;
};

type Bucket = { count: number; resetAt: number };

/**
 * Small in-memory fixed-window rate limiter. Good enough for a single
 * self-hosted instance and avoids pulling in another dependency.
 */
export function rateLimit({ windowMs, max, scope = "api" }: Options) {
  const buckets = new Map<string, Bucket>();

  return function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const now = Date.now();
    const key = `${scope}:${req.ip ?? "unknown"}`;
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      existing.count += 1;
      if (existing.count > max) {
        const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
        res.setHeader("Retry-After", String(retryAfter));
        return res.status(429).json({
          error: "Too many requests",
          retryAfter,
        });
      }
    }

    // Opportunistic cleanup so the map cannot grow forever.
    if (buckets.size > 5_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }

    next();
  };
}
