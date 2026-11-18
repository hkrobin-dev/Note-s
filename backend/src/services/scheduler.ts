import { prisma } from "../lib/prisma";

const CHECK_INTERVAL_MS = 30_000;

const DEMO_USER_ID = "demo_user_001";

function isDue(reminder: any) {
  return reminder.status === "PENDING" && new Date(reminder.scheduledAt) <= new Date();
}

/**
 * Process due reminders and generate today's routine reminders.
 *
 * Exported so it can be invoked by:
 *  - the local long-running scheduler (`npm run scheduler:start`)
 *  - the Vercel Cron endpoint (`/api/cron/tick`)
 *
 * Import-safe: importing this module never starts a timer or touches the DB.
 */
export async function runOnce() {
  // --- 1) Fire due reminders ---
  const due = await prisma.reminder.findMany({
    where: { status: "PENDING", scheduledAt: { lte: new Date() } },
    take: 100,
    include: { user: true },
  });

  for (const r of due) {
    try {
      await prisma.reminder.update({
        where: { id: r.id },
        data: { status: "SENT", sentAt: new Date(), sentAttempts: { increment: 1 } },
      });

      await prisma.notification.create({
        data: {
          userId: r.userId,
          type: "REMINDER",
          title: "Reminder",
          body: r.message,
          link: `/reminders/${r.id}`,
        },
      });
    } catch (err) {
      await prisma.reminder.update({
        where: { id: r.id },
        data: { status: "FAILED", failReason: String(err), sentAttempts: { increment: 1 } },
      });
    }
  }

  // --- 2) Generate today's reminders from active routines ---
  const now = new Date();
  const routines = await prisma.routine.findMany({
    where: { userId: DEMO_USER_ID, active: true },
    include: { task: true },
  });

  const weekdays = [0, 6, 7, 1, 2, 3, 4, 5]; // map JS getDay (0=Sun) to 1=Mon..7=Sun
  const todayDow = weekdays[now.getDay()];

  for (const routine of routines) {
    if (!routine.daysOfWeek.includes(todayDow)) continue;

    const [hh, mm] = routine.timeOfDay.split(":").map(Number);
    const scheduled = new Date(now);
    scheduled.setHours(hh, mm, 0, 0);
    // Apply reminder offset (minutes before)
    scheduled.setMinutes(scheduled.getMinutes() - routine.reminderOffsetMins);

    // Only create if the scheduled time is at-or-in-the-past window of this tick
    // (avoid creating duplicate reminders for the same routine+day)
    const existing = await prisma.reminder.findFirst({
      where: {
        userId: DEMO_USER_ID,
        message: `Routine: ${routine.title}`,
        scheduledAt: {
          gte: new Date(scheduled.getTime() - 60_000),
          lte: new Date(scheduled.getTime() + 60_000),
        },
      },
    });
    if (existing) continue;

    await prisma.reminder.create({
      data: {
        userId: DEMO_USER_ID,
        message: `Routine: ${routine.title}`,
        scheduledAt: scheduled,
        channel: "APP",
        taskId: routine.taskId ?? undefined,
      },
    });
  }
}

// Only run a local interval when executed directly (not when imported by the
// API bridge or the cron handler).
const isDirectRun = (() => {
  if (typeof require !== "undefined" && require.main === module) return true;
  try {
    const path = require("node:path") as typeof import("node:path");
    const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
    return entry === path.resolve(__filename) || /services[\\/]scheduler\.ts$/.test(entry);
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  console.log("Reminder scheduler started");
  runOnce()
    .catch((err) => console.error("Scheduler error:", err))
    .finally(() => setInterval(() => runOnce().catch((err) => console.error("Scheduler error:", err)), CHECK_INTERVAL_MS));
}
