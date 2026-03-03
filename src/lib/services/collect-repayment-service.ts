import type { Prisma, PrismaClient } from "@prisma/client";

import { syncOrderStatus } from "@/lib/services/order-status-service";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type CollectRepaymentErrorCode =
  | "PLAN_NOT_FOUND"
  | "ACCOUNT_NOT_FOUND"
  | "AMOUNT_MISMATCH"
  | "PLAN_ALREADY_PAID";

export class CollectRepaymentError extends Error {
  constructor(
    public readonly code: CollectRepaymentErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CollectRepaymentError";
  }
}

export interface CollectRepaymentInput {
  planId: string;
  accountId: string;
  amount: number;
  occurredAt: Date;
  note?: string;
}

export interface CollectRepaymentResult {
  transactionId: string;
  planId: string;
  orderId: string;
  orderStatus: "active" | "overdue" | "closed";
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function collectRepayment(
  prisma: DbClient,
  input: CollectRepaymentInput,
): Promise<CollectRepaymentResult> {
  const isPrismaClient = "$transaction" in prisma;
  if (isPrismaClient) {
    return prisma.$transaction((tx) => collectRepayment(tx, input));
  }

  const plan = await prisma.repaymentPlan.findUnique({
    where: { id: input.planId },
    select: {
      id: true,
      orderId: true,
      totalDue: true,
      order: {
        select: {
          borrowerName: true,
        },
      },
    },
  });

  if (!plan) {
    throw new CollectRepaymentError(
      "PLAN_NOT_FOUND",
      `repayment plan not found: ${input.planId}`,
    );
  }

  const expected = round2(Number(plan.totalDue));
  if (input.amount !== expected) {
    throw new CollectRepaymentError(
      "AMOUNT_MISMATCH",
      `amount must equal plan totalDue (${expected.toFixed(2)})`,
    );
  }

  const account = await prisma.account.findUnique({
    where: { id: input.accountId },
    select: { id: true },
  });

  if (!account) {
    throw new CollectRepaymentError("ACCOUNT_NOT_FOUND", "account not found");
  }

  const transaction = await prisma.transaction.create({
    data: {
      accountId: input.accountId,
      type: "inflow",
      amount: input.amount,
      occurredAt: input.occurredAt,
      counterparty: plan.order.borrowerName,
      note: input.note,
    },
  });

  const updated = await prisma.repaymentPlan.updateMany({
    where: {
      id: input.planId,
      status: { not: "paid" },
    },
    data: {
      status: "paid",
      paidAt: input.occurredAt,
      transactionId: transaction.id,
    },
  });

  if (updated.count !== 1) {
    throw new CollectRepaymentError("PLAN_ALREADY_PAID", "repayment plan already paid");
  }

  await prisma.account.update({
    where: { id: input.accountId },
    data: {
      currentBalance: {
        increment: input.amount,
      },
    },
  });

  const orderSyncResult = await syncOrderStatus(prisma, plan.orderId, input.occurredAt);

  return {
    transactionId: transaction.id,
    planId: input.planId,
    orderId: plan.orderId,
    orderStatus: orderSyncResult.nextStatus,
  };
}
