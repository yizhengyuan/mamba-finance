import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { parseCollectRepaymentPayload } from "@/lib/api/collect-payload";
import { PayloadValidationError } from "@/lib/api/payload-validation-error";
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

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "invalid JSON body" },
        { status: 400 },
      );
    }

    if (error instanceof PayloadValidationError) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: error.message },
        { status: 400 },
      );
    }

    if (error instanceof CollectRepaymentError && error.code === "PLAN_NOT_FOUND") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: error.message },
        { status: 404 },
      );
    }

    if (error instanceof CollectRepaymentError && error.code === "ACCOUNT_NOT_FOUND") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: error.message },
        { status: 404 },
      );
    }

    if (error instanceof CollectRepaymentError && error.code === "AMOUNT_MISMATCH") {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: error.message },
        { status: 400 },
      );
    }

    if (error instanceof CollectRepaymentError && error.code === "PLAN_ALREADY_PAID") {
      return NextResponse.json(
        { error: "CONFLICT", message: error.message },
        { status: 409 },
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: "CONFLICT",
          message: "repayment plan already linked with another transaction",
        },
        { status: 409 },
      );
    }

    console.error(`POST /api/repayment-plans/${id}/collect failed`, error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to collect repayment" },
      { status: 500 },
    );
  }
}
