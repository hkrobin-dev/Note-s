import { dhakaDayKey, formatDateTime } from "@/lib/dates";

export function dayKey(iso: string | null): string {
  if (!iso) return "";
  return dhakaDayKey(iso);
}

export function isSameDay(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return dhakaDayKey(a) === dhakaDayKey(b);
}

export function eventTime(occ: { startAt: string; endAt: string; allDay: boolean }): string {
  if (occ.allDay) return "All day";
  return `${formatDateTime(occ.startAt, true)} – ${formatDateTime(occ.endAt, false)}`;
}

export function eventsOnDay(events: { startAt: string; endAt: string }[], dayKey: string): typeof events {
  return events.filter((e) => dhakaDayKey(e.startAt) === dayKey);
}

export function monthDays(year: number, month: number): { date: Date; dayKey: string; inMonth: boolean }[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startOffset = first.getUTCDay(); // Sunday = 0
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const total = startOffset + daysInMonth;
  const rows = Math.ceil(total / 7) * 7;
  const out: { date: Date; dayKey: string; inMonth: boolean }[] = [];
  for (let i = 0; i < rows; i++) {
    const d = new Date(Date.UTC(year, month - 1, 1 - startOffset + i));
    out.push({ date: d, dayKey: dhakaDayKey(d), inMonth: i >= startOffset && i < startOffset + daysInMonth });
  }
  return out;
}
