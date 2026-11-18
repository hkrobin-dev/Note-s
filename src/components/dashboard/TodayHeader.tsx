"use client";

import { greeting, todayLine } from "@/lib/dates";

/** Client-rendered so the greeting always reflects the user's current day (Asia/Dhaka). */
export function TodayHeader() {
  return (
    <div className="min-w-0 space-y-1">
      <p className="type-label text-ink-3">{todayLine()}</p>
      <h1 className="type-display text-ink text-balance">{greeting()}</h1>
      <p className="type-body-sm max-w-xl text-ink-2">
        A clear, personal view of what matters today — your tasks, schedule, and progress in one place.
      </p>
    </div>
  );
}
