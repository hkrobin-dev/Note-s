import { APP_TIMEZONE, dhakaDayKey } from "@/lib/dates";
import type { TaskPriority } from "@/types";

const TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIMEZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const DAY = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIMEZONE,
  day: "numeric",
  month: "short",
});

export type DueTone = "overdue" | "today" | "soon" | "normal" | "none";

export function dueInfo(dueDate: string | null): { text: string; tone: DueTone } {
  if (!dueDate) return { text: "No due date", tone: "none" };

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return { text: "No due date", tone: "none" };

  const today = dhakaDayKey();
  const dueKey = dhakaDayKey(due);
  const diffDays = Math.round(
    (Date.parse(`${dueKey}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  );
  const time = TIME.format(due);

  if (due.getTime() < Date.now() && diffDays <= 0) {
    return { text: diffDays === 0 ? `Today ${time}` : `${DAY.format(due)}, ${time}`, tone: "overdue" };
  }
  if (diffDays === 0) return { text: `Today ${time}`, tone: "today" };
  if (diffDays === 1) return { text: `Tomorrow ${time}`, tone: "soon" };
  if (diffDays > 1 && diffDays < 7) return { text: `${DAY.format(due)}, ${time}`, tone: "soon" };
  return { text: `${DAY.format(due)}, ${time}`, tone: "normal" };
}

/** ISO instant → value for a datetime-local input, expressed in Dhaka wall time. */
export function toDhakaInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** datetime-local value (Dhaka wall time) → ISO instant. */
export function fromDhakaInput(value: string): string | null {
  if (!value) return null;
  const iso = new Date(`${value}:00+06:00`);
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
}

export const PRIORITY_STYLE: Record<TaskPriority, { label: string; dot: string; text: string }> = {
  URGENT: { label: "Urgent", dot: "bg-error", text: "text-error" },
  HIGH: { label: "High", dot: "bg-warning", text: "text-warning" },
  MEDIUM: { label: "Medium", dot: "bg-accent-2", text: "text-accent-2" },
  LOW: { label: "Low", dot: "bg-ink-3", text: "text-ink-3" },
};
