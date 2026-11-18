import { Router as createRouter } from "express";
import type { RequestHandler } from "express";

const METHODS = ["get", "post", "put", "patch", "delete", "all"] as const;

/**
 * Drop-in replacement for express.Router() that forwards rejections from
 * `async` route handlers to Express error middleware.
 *
 * Express 4 does not await route handlers. When an async handler throws (for
 * example a Prisma error), the promise rejects silently and no response is
 * ever sent — the request hangs until the platform timeout (60s on Vercel).
 * Wrapping the handler makes the existing error handler in index.ts return a
 * normal 500 response immediately.
 */
export function Router(): ReturnType<typeof createRouter> {
  const router = createRouter();

  for (const method of METHODS) {
    const register = (router as any)[method].bind(router);
    (router as any)[method] = (...args: unknown[]) =>
      register(
        ...args.map((arg) => {
          if (typeof arg !== "function" || arg.constructor?.name !== "AsyncFunction") return arg;
          const handler = arg as RequestHandler;
          return (req: any, res: any, next: any) => {
            try {
              const result = (handler as any)(req, res, next);
              if (result && typeof result.catch === "function") result.catch(next);
              return result;
            } catch (error) {
              next(error);
            }
          };
        }),
      );
  }

  return router;
}
