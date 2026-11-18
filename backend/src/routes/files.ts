import { Router } from "express";
import multer from "multer";
import { body, validationResult } from "express-validator";
import { prisma } from "../lib/prisma";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

// Keep the file in memory so it can be persisted to Postgres. Local-disk storage
// does not survive serverless invocations (and the filesystem may be read-only).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || "4") * 1024 * 1024 },
});

// Persist bytes in the DB. `storagePath` is retained for local/dev files and as
// a human-readable label; on Vercel the `data` column is the source of truth.
function persistBytes(file: Express.Multer.File): string {
  const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${Date.now()}-${safe}`;
}

router.post("/", upload.single("file"), body("linkedId").optional(), body("linkedKind").optional(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const safeFilename = persistBytes(req.file);
  const file = await prisma.storedFile.create({
    data: {
      userId,
      filename: req.file.originalname,
      safeFilename,
      storagePath: safeFilename,
      mimeType: req.file.mimetype,
      byteSize: req.file.size,
      data: new Uint8Array(req.file.buffer),
    },
  });

  if (req.body.linkedId && req.body.linkedKind) {
    await prisma.fileLink.create({
      data: { fileId: file.id, linkedId: req.body.linkedId, linkedKind: req.body.linkedKind },
    });
  }

  // Never return the byte payload to the client.
  const { data: _data, ...publicFile } = file as any;
  res.status(201).json({ file: publicFile });
});

router.get("/", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const files = await prisma.storedFile.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, filename: true, safeFilename: true, storagePath: true,
      mimeType: true, byteSize: true, checksum: true, createdAt: true, deletedAt: true,
      userId: true,
    },
  });
  res.json({ files });
});

function fileBuffer(file: any): Buffer | null {
  if (file.data) return Buffer.from(file.data as Uint8Array);
  return null;
}

router.get("/:id/download", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const file = await prisma.storedFile.findFirst({ where: { id: req.params.id, userId } });
  if (!file) return res.status(404).json({ error: "File not found" });

  const bytes = fileBuffer(file);
  if (bytes) {
    res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`);
    return res.send(bytes);
  }

  // Legacy local-disk files (development only).
  return res.download(file.storagePath, file.filename);
});

router.get("/:id/preview", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const file = await prisma.storedFile.findFirst({
    where: { id: req.params.id, userId, deletedAt: null },
  });
  if (!file) return res.status(404).json({ error: "File not found" });

  res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`);

  const bytes = fileBuffer(file);
  if (bytes) return res.send(bytes);

  // Legacy local-disk files (development only).
  const path = require("node:path") as typeof import("node:path");
  return res.sendFile(path.resolve(file.storagePath));
});

router.patch("/:id", body("filename").trim().isLength({ min: 1, max: 255 }), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const fileId = req.params?.id ?? "";
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.storedFile.findFirst({ where: { id: fileId, userId } });
  if (!existing) return res.status(404).json({ error: "File not found" });

  const file = await prisma.storedFile.update({
    where: { id: existing.id },
    data: { filename: String(req.body.filename).trim() },
    select: {
      id: true, filename: true, safeFilename: true, storagePath: true,
      mimeType: true, byteSize: true, checksum: true, createdAt: true, deletedAt: true,
      userId: true,
    },
  });
  res.json({ file });
});

router.delete("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.storedFile.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "File not found" });
  await prisma.storedFile.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  res.json({ ok: true });
});

export default router;
