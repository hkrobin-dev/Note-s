export function statusColor(variance: number): string {
  if (variance >= 0) return "text-positive";
  return "text-error";
}

export function progressPct(spent: number, budgeted: number): number {
  if (budgeted <= 0) return 0;
  return Math.min(100, Math.round((spent / budgeted) * 100));
}
