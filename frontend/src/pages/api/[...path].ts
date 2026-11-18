import type { NextApiRequest, NextApiResponse } from "next";
import expressApp from "../../../.backend-runtime/src/index";

/**
 * Single-Vercel-project API bridge.
 *
 * All requests to `/api/*` are handled by the Express app. Its source is copied
 * from the sibling `backend/` directory into `.backend-runtime/` by the
 * `prebuild`/`predev` script, so it is part of this Next.js project at build
 * time and all its dependencies resolve from `frontend/node_modules`.
 */
const backendApp = expressApp as unknown as (
  req: NextApiRequest,
  res: NextApiResponse
) => void;

export const config = {
  api: {
    // Let Express consume the raw body (multer needs the stream).
    bodyParser: false,
    // Express terminates the response itself.
    externalResolver: true,
    // File downloads/previews can exceed Next's 4MB warning threshold.
    responseLimit: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Next.js passes the original URL for Pages Router API routes. Normalize the
  // few cases where a bare path is received so Express routes still match.
  if (req.url && req.url !== "/" && !req.url.startsWith("/api/")) {
    req.url = `/api${req.url.startsWith("/") ? req.url : `/${req.url}`}`;
  }
  return backendApp(req, res);
}
