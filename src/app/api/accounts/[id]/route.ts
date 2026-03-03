import { Prisma } from "@prisma/client";

import {
  parseUpdateAccountPayload,
  PayloadValidationError,
} from "@/lib/api/account-payload";
import { fail, ok } from "@/lib/api/http";
import { logApiError, logBusinessEvent } from "@/lib/observability/audit-log";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const payload = await request.json();
    const input = parseUpdateAccountPayload(payload);

    const account = await prisma.account.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    logBusinessEvent("ACCOUNT_UPDATED", {
      accountId: account.id,
      accountType: account.type,
      isActive: account.isActive,
    });

    return ok(account);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return fail("NOT_FOUND", `account not found: ${id}`, 404);
    }

    if (error instanceof SyntaxError) {
      return fail("BAD_REQUEST", "invalid JSON body", 400);
    }

    if (error instanceof PayloadValidationError) {
      return fail("BAD_REQUEST", error.message, 400);
    }

    logApiError(`PATCH /api/accounts/${id}`, error, { accountId: id });
    return fail("INTERNAL_SERVER_ERROR", "Failed to update account", 500);
  }
}
