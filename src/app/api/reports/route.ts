import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { reportQuerySchema } from "@/lib/validation/report";
import { getBudgetVsActual, getReportSummary } from "@/server/reports";

export async function GET(request: NextRequest) {
  // Read request-time data outside the try/catch so Next.js can handle its
  // prerender bail-out signal instead of treating it as an API error.
  const searchParams = request.nextUrl.searchParams;
  try {
    const query = reportQuerySchema.parse(Object.fromEntries(searchParams));
    const [summary, budgetVsActual] = await Promise.all([
      getReportSummary(query),
      getBudgetVsActual(query),
    ]);
    return Response.json({ summary, budgetVsActual });
  } catch (error) {
    return handleApiError(error);
  }
}
