import { fail, ok } from "@/lib/api/http";
import { logApiError } from "@/lib/observability/audit-log";
import { prisma } from "@/lib/prisma";
import { getDailyBrief } from "@/lib/services/daily-brief-service";

export async function GET() {
  try {
    const data = await getDailyBrief(prisma);
    return ok(data);
  } catch (error) {
    logApiError("GET /api/ai/daily-brief", error);
    return fail("INTERNAL_SERVER_ERROR", "Failed to generate daily brief", 500);
  }
}
