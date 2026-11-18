import { formatDateTime } from "@/lib/dates";

export function projectDate(iso: string | null): string {
  if (!iso) return "—";
  return formatDateTime(iso, false);
}

export function projectStatusTone(status: string): string {
  switch (status) {
    case "PLANNING":
      return "text-ink-3";
    case "ACTIVE":
      return "text-positive";
    case "ON_HOLD":
      return "text-warning";
    case "COMPLETED":
      return "text-accent-2";
    case "ARCHIVED":
      return "text-ink-3";
    default:
      return "text-ink-3";
  }
}

export function priorityDot(priority: string): string {
  switch (priority) {
    case "URGENT":
      return "bg-error";
    case "HIGH":
      return "bg-warning";
    case "MEDIUM":
      return "bg-accent-2";
    case "LOW":
      return "bg-ink-3";
    default:
      return "bg-ink-3";
  }
}
