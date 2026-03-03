import { parseDashboardChartQuery } from "@/lib/api/dashboard-chart-query";
import { fail, ok } from "@/lib/api/http";
import { PayloadValidationError } from "@/lib/api/payload-validation-error";
import { logApiError } from "@/lib/observability/audit-log";
import { prisma } from "@/lib/prisma";
import { getDashboardCharts } from "@/lib/services/dashboard-chart-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = parseDashboardChartQuery({
      range: searchParams.get("range") ?? undefined,
    });

    const data = await getDashboardCharts(prisma, parsed);
    return ok(data);
  } catch (error) {
    if (error instanceof PayloadValidationError) {
      return fail("BAD_REQUEST", error.message, 400);
    }

    logApiError("GET /api/dashboard/charts", error);
    return fail("INTERNAL_SERVER_ERROR", "Failed to load dashboard charts", 500);
  }
}
