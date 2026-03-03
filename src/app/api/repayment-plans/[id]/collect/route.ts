import { Prisma } from "@prisma/client";

import { fail, ok } from "@/lib/api/http";
import { parseCollectRepaymentPayload } from "@/lib/api/collect-payload";
import { PayloadValidationError } from "@/lib/api/payload-validation-error";
import { logApiError, logBusinessEvent } from "@/lib/observability/audit-log";
import { prisma } from "@/lib/prisma";
import {
  collectRepayment,
  CollectRepaymentError,
} from "@/lib/services/collect-repayment-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const payload = await request.json();
    const input = parseCollectRepaymentPayload(payload);

    const result = await collectRepayment(prisma, {
      planId: id,
      accountId: input.accountId,
      amount: input.amount,
      occurredAt: input.occurredAt,
      note: input.note,
    });

    logBusinessEvent("REPAYMENT_COLLECTED", {
      planId: result.planId,
      orderId: result.orderId,
      transactionId: result.transactionId,
      orderStatus: result.orderStatus,
    });

    return ok(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return fail("BAD_REQUEST", "invalid JSON body", 400);
    }

    if (error instanceof PayloadValidationError) {
      return fail("BAD_REQUEST", error.message, 400);
    }

    if (error instanceof CollectRepaymentError) {
      if (error.code === "PLAN_NOT_FOUND" || error.code === "ACCOUNT_NOT_FOUND") {
        return fail("NOT_FOUND", error.message, 404);
      }

      if (error.code === "AMOUNT_MISMATCH") {
        return fail("BAD_REQUEST", error.message, 400);
      }

      if (error.code === "PLAN_ALREADY_PAID") {
        return fail("CONFLICT", error.message, 409);
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return fail(
        "CONFLICT",
        "repayment plan already linked with another transaction",
        409,
      );
    }

    logApiError(`POST /api/repayment-plans/${id}/collect`, error, {
      repaymentPlanId: id,
    });
    return fail("INTERNAL_SERVER_ERROR", "Failed to collect repayment", 500);
  }
}
