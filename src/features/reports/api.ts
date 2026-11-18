import type { BudgetVsActual, ReportQueryInput, ReportSummary } from "@/lib/validation/report";

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export function reportQueryString(params: ReportQueryInput): string {
  const searchParams = new URLSearchParams();
  if (params.month) searchParams.set("month", params.month.toISOString());
  if (params.categoryId) searchParams.set("categoryId", params.categoryId);
  return searchParams.toString();
}

export async function fetchReport(): Promise<{
  summary: ReportSummary;
  budgetVsActual: BudgetVsActual[];
}> {
  const qs = reportQueryString({ month: undefined, categoryId: undefined });
  const response = await fetch(`/api/reports${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as { summary: ReportSummary; budgetVsActual: BudgetVsActual[] };
}

export async function fetchReportByMonth(month: string): Promise<{
  summary: ReportSummary;
  budgetVsActual: BudgetVsActual[];
}> {
  const qs = reportQueryString({ month: new Date(month), categoryId: undefined });
  const response = await fetch(`/api/reports?${qs}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as { summary: ReportSummary; budgetVsActual: BudgetVsActual[] };
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString("en-BD", { style: "currency", currency: "BDT" });
}
