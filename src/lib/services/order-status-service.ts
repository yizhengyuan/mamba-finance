import type { PrismaClient } from "@prisma/client";

import {
  deriveOrderStatus,
  type OrderStatus,
} from "@/lib/domain/order-status-machine";

export interface SyncOrderStatusResult {
  orderId: string;
  previousStatus: OrderStatus;
  nextStatus: OrderStatus;
  updated: boolean;
}

export async function syncOrderStatus(
  prisma: PrismaClient,
  orderId: string,
  now: Date = new Date(),
): Promise<SyncOrderStatusResult> {
  return prisma.$transaction(async (tx) => {
    await tx.repaymentPlan.updateMany({
      where: {
        orderId,
        status: { not: "paid" },
        dueDate: { lt: now },
      },
      data: { status: "overdue" },
    });

    await tx.repaymentPlan.updateMany({
      where: {
        orderId,
        status: "overdue",
        dueDate: { gte: now },
      },
      data: { status: "pending" },
    });

    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        repaymentPlans: {
          select: {
            dueDate: true,
            status: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const previousStatus = order.status;
    const nextStatus = deriveOrderStatus({
      plans: order.repaymentPlans,
      now,
      currentStatus: previousStatus,
    });

    if (nextStatus !== previousStatus) {
      await tx.order.update({
        where: { id: orderId },
        data: { status: nextStatus },
      });
    }

    return {
      orderId,
      previousStatus,
      nextStatus,
      updated: nextStatus !== previousStatus,
    };
  });
}

export async function syncActiveOrdersStatus(
  prisma: PrismaClient,
  now: Date = new Date(),
): Promise<SyncOrderStatusResult[]> {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["active", "overdue"] },
    },
    select: { id: true },
  });

  const results: SyncOrderStatusResult[] = [];
  for (const order of orders) {
    results.push(await syncOrderStatus(prisma, order.id, now));
  }

  return results;
}
