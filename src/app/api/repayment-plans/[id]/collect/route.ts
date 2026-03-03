import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { parseCollectRepaymentPayload } from "@/lib/api/collect-payload";
import { PayloadValidationError } from "@/lib/api/payload-validation-error";
import { prisma } from "@/lib/prisma";
import { syncOrderStatus } from "@/lib/services/order-status-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const payload = await request.json();
    const input = parseCollectRepaymentPayload(payload);

    const result = await prisma.$transaction(async (tx) => {
      const plan = await tx.repaymentPlan.findUnique({
        where: { id },
        select: {
          id: true,
          orderId: true,
          totalDue: true,
          status: true,
          order: {
            select: {
              borrowerName: true,
            },
          },
        },
      });

      if (!plan) {
        throw new Error("PLAN_NOT_FOUND");
      }

      const expected = round2(Number(plan.totalDue));
      if (input.amount !== expected) {
        throw new PayloadValidationError(
          `amount must equal plan totalDue (${expected.toFixed(2)})`,
        );
      }

      const account = await tx.account.findUnique({
        where: { id: input.accountId },
        select: { id: true },
      });

      if (!account) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      const transaction = await tx.transaction.create({
        data: {
          accountId: input.accountId,
          type: "inflow",
          amount: input.amount,
          occurredAt: input.occurredAt,
          counterparty: plan.order.borrowerName,
          note: input.note,
        },
      });

      const updated = await tx.repaymentPlan.updateMany({
        where: {
          id,
          status: { not: "paid" },
        },
        data: {
          status: "paid",
          paidAt: input.occurredAt,
          transactionId: transaction.id,
        },
      });

      if (updated.count !== 1) {
        throw new Error("PLAN_ALREADY_PAID");
      }

      await tx.account.update({
        where: { id: input.accountId },
        data: {
          currentBalance: {
            increment: input.amount,
          },
        },
      });

      const orderSyncResult = await syncOrderStatus(tx, plan.orderId, input.occurredAt);

      return {
        transactionId: transaction.id,
        planId: id,
        orderId: plan.orderId,
        orderStatus: orderSyncResult.nextStatus,
      };
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

    if (error instanceof Error && error.message === "PLAN_NOT_FOUND") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `repayment plan not found: ${id}` },
        { status: 404 },
      );
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_FOUND") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "account not found" },
        { status: 404 },
      );
    }

    if (error instanceof Error && error.message === "PLAN_ALREADY_PAID") {
      return NextResponse.json(
        { error: "CONFLICT", message: "repayment plan already paid" },
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
