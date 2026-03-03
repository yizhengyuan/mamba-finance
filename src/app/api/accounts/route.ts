import {
  parseCreateAccountPayload,
  PayloadValidationError,
} from "@/lib/api/account-payload";
import { fail, ok } from "@/lib/api/http";
import { logApiError, logBusinessEvent } from "@/lib/observability/audit-log";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { createdAt: "desc" },
    });

    return ok(accounts);
  } catch (error) {
    logApiError("GET /api/accounts", error);
    return fail("INTERNAL_SERVER_ERROR", "Failed to fetch accounts", 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const input = parseCreateAccountPayload(payload);

    const account = await prisma.account.create({
      data: {
        name: input.name,
        type: input.type,
        currency: "CNY",
        openingBalance: input.openingBalance,
        currentBalance: input.openingBalance,
      },
    });

    logBusinessEvent("ACCOUNT_CREATED", {
      accountId: account.id,
      accountType: account.type,
      openingBalance: Number(account.openingBalance),
    });

    return ok(account, 201);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return fail("BAD_REQUEST", "invalid JSON body", 400);
    }

    if (error instanceof PayloadValidationError) {
      return fail("BAD_REQUEST", error.message, 400);
    }

    logApiError("POST /api/accounts", error);
    return fail("INTERNAL_SERVER_ERROR", "Failed to create account", 500);
  }
}
