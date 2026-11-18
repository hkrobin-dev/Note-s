import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

// Read lazily: the Express app is imported by the Next.js API bridge at build
// time, when secrets are not necessarily present. Fail at request time instead
// of crashing the build.
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

export interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const payload = jwt.verify(token, getSecret()) as { userId: string; email: string };
    req.user = { id: payload.userId, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function signToken(userId: string, email: string, ttl: string) {
  return jwt.sign({ userId, email }, getSecret() as any, { expiresIn: ttl } as any);
}
