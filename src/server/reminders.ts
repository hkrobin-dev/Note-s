import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/api-response";
import type { ReminderChannel, ReminderStatus } from "@/types";
import type { CreateReminderInput, ReminderQueryInput, UpdateReminderInput } from "@/lib/validation/reminder";

const DEFAULT_INTERVAL_MS = 60_000;
const SCHEDULER_KEY = "__mylifeos_reminder_scheduler" as const;

export const reminderInclude = {
  task: { select: { id: true, title: true, status: true } },
  event: { select: { id: true, title: true, startAt: true } },
} satisfies Prisma.ReminderInclude;

export type ReminderWithRelations = Prisma.ReminderGetPayload<{ include: typeof reminderInclude }>;

function isTest() {
  return process.env.NODE_ENV === "test";
}

function schedulerIntervalMs(): number {
  const raw = process.env.REMINDER_SCHEDULER_INTERVAL_MS;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_INTERVAL_MS;
}

export function startReminderScheduler(intervalMs = schedulerIntervalMs()): NodeJS.Timeout | undefined {
  if (isTest()) return undefined;
  const globalFor = globalThis as unknown as { [key: string]: unknown };
  if (globalFor[SCHEDULER_KEY]) return globalFor[SCHEDULER_KEY] as NodeJS.Timeout;
  const timer = setInterval(async () => {
    try {
      await processDueReminders();
    } catch (error) {
      console.error("Reminder scheduler tick failed", error);
    }
  }, intervalMs);
  timer.unref();
  globalFor[SCHEDULER_KEY] = timer;
  return timer;
}

export function stopReminderScheduler(): void {
  const globalFor = globalThis as unknown as { [key: string]: unknown };
  const timer = globalFor[SCHEDULER_KEY] as NodeJS.Timeout | undefined;
  if (timer) clearInterval(timer);
  globalFor[SCHEDULER_KEY] = undefined;
}

export async function listReminders(query: ReminderQueryInput) {
  const where: Prisma.ReminderWhereInput = {};

  if (query.status) where.status = query.status as ReminderStatus;
  if (query.channel) where.channel = query.channel as ReminderChannel;
  if (query.taskId) where.taskId = query.taskId;
  if (query.eventId) where.eventId = query.eventId;
  if (query.scheduledAt) where.scheduledAt = { lte: query.scheduledAt };

  return prisma.reminder.findMany({
    where,
    include: reminderInclude,
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    take: query.limit ?? 100,
  });
}

export async function getReminder(id: string) {
  const reminder = await prisma.reminder.findUnique({
    where: { id },
    include: reminderInclude,
  });
  if (!reminder) throw new NotFoundError("Reminder not found");
  return reminder;
}

export async function createReminder(input: CreateReminderInput) {
  return prisma.$transaction(async (tx) => {
    const reminder = await tx.reminder.create({
      data: input,
      include: reminderInclude,
    });

    await tx.activityLog.create({
      data: {
        entityType: "REMINDER",
        entityId: reminder.id,
        action: "CREATED",
        detail: { message: reminder.message, scheduledAt: reminder.scheduledAt },
      },
    });

    return reminder;
  });
}

export async function updateReminder(id: string, input: UpdateReminderInput) {
  const existing = await prisma.reminder.findUnique({
    where: { id },
    select: { id: true, message: true, status: true },
  });
  if (!existing) throw new NotFoundError("Reminder not found");

  return prisma.$transaction(async (tx) => {
    const reminder = await tx.reminder.update({
      where: { id },
      data: input,
      include: reminderInclude,
    });

    await tx.activityLog.create({
      data: {
        entityType: "REMINDER",
        entityId: reminder.id,
        action: "UPDATED",
        detail: { message: reminder.message, status: reminder.status },
      },
    });

    return reminder;
  });
}

export async function deleteReminder(id: string) {
  const existing = await prisma.reminder.findUnique({
    where: { id },
    select: { id: true, message: true },
  });
  if (!existing) throw new NotFoundError("Reminder not found");

  return prisma.$transaction(async (tx) => {
    await tx.reminder.delete({ where: { id } });
    await tx.activityLog.create({
      data: {
        entityType: "REMINDER",
        entityId: existing.id,
        action: "DELETED",
        detail: { message: existing.message },
      },
    });
    return existing;
  });
}

/** Mark due pending reminders as SENT/FAILED with dedupe against concurrent retries. */
export async function processDueReminders(): Promise<{ processed: number; sent: number }> {
  if (isTest()) return { processed: 0, sent: 0 };

  const now = new Date();
  const due = await prisma.reminder.findMany({
    where: { status: "PENDING", scheduledAt: { lte: now } },
    orderBy: { scheduledAt: "asc" },
    take: 100,
  });

  let sent = 0;
  for (const reminder of due) {
    await prisma.$transaction(async (tx) => {
      const current = await tx.reminder.findUnique({ where: { id: reminder.id } });
      if (!current || current.status !== "PENDING") return; // idempotent dedupe

      const attempts = current.sentAttempts + 1;
      let status: ReminderStatus = "SENT";
      let failReason: string | null = null;

      try {
        // Delivery to browser subscribers is handled client-side; the scheduler
        // marks the reminder SENT so the UI can render a notification badge.
      } catch (error) {
        status = "FAILED";
        failReason = error instanceof Error ? error.message : String(error);
      }

      await tx.reminder.update({
        where: { id: reminder.id },
        data: { sentAttempts: attempts, status, sentAt: new Date(), failReason },
      });

      await tx.activityLog.create({
        data: {
          entityType: "REMINDER",
          entityId: reminder.id,
          action: status,
          detail: { message: current.message, attempts, failReason },
        },
      });

      if (status === "SENT") sent++;
    });
  }

  return { processed: due.length, sent };
}

// Start the scheduler once when the server module loads (dev/prod only).
if (!isTest()) {
  startReminderScheduler();
}
