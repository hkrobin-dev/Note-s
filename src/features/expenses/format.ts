import { formatDateTime, dhakaDayKey } from "@/lib/dates";

export function expenseDate(iso: string): string {
  return formatDateTime(iso, false);
}

export function expenseDateTime(iso: string): string {
  return formatDateTime(iso, true);
}

export function isSameDay(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return dhakaDayKey(a) === dhakaDayKey(b);
}

export function formatAmount(amount: string | number | null): string {
  if (amount == null) return "";
  const n = typeof amount === "string" ? Number(amount) : amount;
  return n.toLocaleString("en-BD", { style: "currency", currency: "BDT" });
}
