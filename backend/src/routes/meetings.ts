import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

const meetingSchema = z.object({
  title: z.string().min(1).max(200),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional().nullable(),
  location: z.string().max(300).optional().nullable(),
  link: z.string().max(2000).optional().nullable(),
  attendees: z.array(z.string().max(200)).optional(),
  agenda: z.string().max(20000).optional().nullable(),
  notes: z.string().max(100000).optional().nullable(),
  status: z.enum(["SCHEDULED", "DONE", "CANCELLED"]).optional(),
});

router.get("/", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const scope = typeof req.query.scope === "string" ? req.query.scope : "all";
  const now = new Date();
  const where: any = { userId };
  if (scope === "upcoming") where.startAt = { gte: now };
  if (scope === "past") where.startAt = { lt: now };

  const meetings = await prisma.meeting.findMany({
    where,
    include: { actionItems: { orderBy: [{ done: "asc" }, { createdAt: "asc" }] } },
    orderBy: { startAt: scope === "past" ? "desc" : "asc" },
    take: 100,
  });
  res.json({ meetings });
});

router.post("/", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const parsed = meetingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { startAt, endAt, ...rest } = parsed.data;
  const meeting = await prisma.meeting.create({
    data: {
      ...rest,
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : null,
      userId,
    },
  });
  res.status(201).json({ meeting });
});

router.patch("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.meeting.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Meeting not found" });

  const parsed = meetingSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { startAt, endAt, ...rest } = parsed.data;
  const meeting = await prisma.meeting.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(startAt ? { startAt: new Date(startAt) } : {}),
      ...(endAt !== undefined ? { endAt: endAt ? new Date(endAt) : null } : {}),
    },
  });
  res.json({ meeting });
});

router.delete("/:id", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const existing = await prisma.meeting.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: "Meeting not found" });
  await prisma.meeting.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Action items
// ---------------------------------------------------------------------------

const actionItemSchema = z.object({
  text: z.string().min(1).max(500),
  assignee: z.string().max(120).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

async function ownedMeeting(userId: string, meetingId: string) {
  return prisma.meeting.findFirst({ where: { id: meetingId, userId }, select: { id: true } });
}

router.post("/:id/action-items", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const meeting = await ownedMeeting(userId, req.params?.id ?? "");
  if (!meeting) return res.status(404).json({ error: "Meeting not found" });

  const parsed = actionItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { text, assignee, dueDate } = parsed.data;
  const actionItem = await prisma.meetingActionItem.create({
    data: {
      meetingId: meeting.id,
      text: text.trim(),
      assignee: assignee?.trim() || null,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });
  res.status(201).json({ actionItem });
});

router.patch("/:id/action-items/:itemId", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const meeting = await ownedMeeting(userId, req.params?.id ?? "");
  if (!meeting) return res.status(404).json({ error: "Meeting not found" });

  const existing = await prisma.meetingActionItem.findFirst({
    where: { id: req.params?.itemId ?? "", meetingId: meeting.id },
  });
  if (!existing) return res.status(404).json({ error: "Action item not found" });

  const parsed = actionItemSchema.partial().extend({ done: z.boolean().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { text, assignee, dueDate, done } = parsed.data;
  const actionItem = await prisma.meetingActionItem.update({
    where: { id: existing.id },
    data: {
      ...(text !== undefined ? { text: text.trim() } : {}),
      ...(assignee !== undefined ? { assignee: assignee?.trim() || null } : {}),
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      ...(done !== undefined ? { done } : {}),
    },
  });
  res.json({ actionItem });
});

router.delete("/:id/action-items/:itemId", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const meeting = await ownedMeeting(userId, req.params?.id ?? "");
  if (!meeting) return res.status(404).json({ error: "Meeting not found" });

  const existing = await prisma.meetingActionItem.findFirst({
    where: { id: req.params?.itemId ?? "", meetingId: meeting.id },
  });
  if (!existing) return res.status(404).json({ error: "Action item not found" });
  await prisma.meetingActionItem.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

export default router;
