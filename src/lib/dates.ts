// Dates & timezone — presentation always converts to Asia/Dhaka (PROJECT_SPEC §6, §14).

export const APP_TIMEZONE = "Asia/Dhaka";

/** Format a Date (or ISO string) for display in the app timezone. */
export function formatDateTime(d: Date | string, withTime = true): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: true } : {}),
  }).format(date);
}

export function formatDate(d: Date | string): string {
  return formatDateTime(d, false);
}

/** "17 Oct 2026, 09:30 pm" → parts for dashboard greeting/date. */
export function todayLine(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

/** Greeting by Dhaka hour. */
export function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIMEZONE, hour: "2-digit", hour12: false }).format(new Date()),
  );
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

/** Parse a `yyyy-mm-dd` string as a date anchored at Dhaka midnight (UTC+6 → -06:00 offset). */
export function parseDhakaDate(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T00:00:00+06:00`);
}

/**
 * First day of month expressed in Dhaka terms, as UTC marker for month buckets.
 * E.g. a transaction at 2026-10-27 21:30 Dhaka belongs to October even though its
 * UTC instant is 15:30 same day; a txn at 01:00 Dhaka = previous day 19:00 UTC but
 * still October in Dhaka. We bucket by shifting to Dhaka then taking the month.
 */
export function dhakaMonthKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE, year: "numeric", month: "2-digit",
  }).format(date);
  return s; // "YYYY-MM"
}

export function addMonths(dateISO: string, n: number): string {
  const [y, m] = dateISO.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" for a date as seen in Dhaka. */
export function dhakaDayKey(d: Date | string = new Date()): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * UTC instants for the start/end of a Dhaka calendar day (offset 0 = today).
 * Dhaka has no DST, so a fixed +06:00 anchor is safe and avoids server-local time.
 */
export function dhakaDayBounds(offsetDays = 0): { start: Date; end: Date } {
  const shifted = new Date(Date.now() + offsetDays * 86_400_000);
  const start = new Date(`${dhakaDayKey(shifted)}T00:00:00+06:00`);
  return { start, end: new Date(start.getTime() + 86_400_000 - 1) };
}

