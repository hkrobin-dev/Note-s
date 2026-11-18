// Currency formatting — BDT (৳) primary, tabular numerals friendly.
// Nunjucks of Float for money is forbidden; formatting accepts string|number|Decimal.toString().

export type MoneyInput = string | number; // pass Primitive from Prisma Decimal via .toString()

export function formatBDT(value: MoneyInput, opts?: { compact?: boolean; signed?: boolean }) {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "৳ 0";
  const abs = Math.abs(n);
  const formatted = opts?.compact && abs >= 100000
    ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(abs / 100000)}L` // lakh
    : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(abs);
  const sign = opts?.signed && n > 0 ? "+" : n < 0 ? "−" : "";
  return `৳ ${sign}${formatted}`;
}

export function parseMoney(input: unknown): unknown | null {
  // Guard for client input; real validation lives in Zod
  if (typeof input === "number" && Number.isFinite(input)) return input.toFixed(2);
  if (typeof input === "string" && input.trim() !== "") {
    const n = Number(input.replace(/,/g, ""));
    return Number.isFinite(n) ? n.toFixed(2) : null;
  }
  return null;
}

export function percentUsed(spent: MoneyInput, budget: MoneyInput): number | null {
  const b = Number(budget), s = Number(spent);
  if (!Number.isFinite(b) || !Number.isFinite(s) || b <= 0) return null;
  return (s / b) * 100;
}
