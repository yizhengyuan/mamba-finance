import { fail, ok } from "@/lib/api/http";
import { parseCalendarRepaymentQuery } from "@/lib/api/calendar-repayment-query";
import { PayloadValidationError } from "@/lib/api/payload-validation-error";
import { logApiError } from "@/lib/observability/audit-log";
import { prisma } from "@/lib/prisma";
import { getCalendarRepayments } from "@/lib/services/calendar-repayment-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = parseCalendarRepaymentQuery({
      month: searchParams.get("month") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      keyword: searchParams.get("keyword") ?? undefined,
    });

    const data = await getCalendarRepayments(prisma, parsed);
    return ok(data);
  } catch (error) {
    if (error instanceof PayloadValidationError) {
      return fail("BAD_REQUEST", error.message, 400);
    }

    logApiError("GET /api/calendar/repayments", error);
    return fail(
      "INTERNAL_SERVER_ERROR",
      "Failed to fetch calendar repayments",
      500,
    );
  }
}
