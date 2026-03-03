import { NextResponse } from "next/server";

import { getUtcDayRange, getUtcMonthRange } from "@/lib/domain/date-ranges";
import { prisma } from "@/lib/prisma";

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export async function GET() {
  try {
    const now = new Date();
    const day = getUtcDayRange(now);
    const month = getUtcMonthRange(now);

    const [
      assetAgg,
      outstandingPrincipalAgg,
      monthlyInterestAgg,
      todayDueAgg,
      overdueAgg,
      todayDuePlans,
      overduePlans,
    ] = await Promise.all([
      prisma.account.aggregate({
        _sum: { currentBalance: true },
      }),
      prisma.repaymentPlan.aggregate({
        where: { status: { not: "paid" } },
        _sum: { principalDue: true },
      }),
      prisma.repaymentPlan.aggregate({
        where: {
          status: { not: "paid" },
          dueDate: {
            gte: month.start,
            lt: month.end,
          },
        },
        _sum: { interestDue: true },
      }),
      prisma.repaymentPlan.aggregate({
        where: {
          status: { in: ["pending", "overdue"] },
          dueDate: { gte: day.start, lt: day.end },
        },
        _count: { _all: true },
        _sum: { totalDue: true },
      }),
      prisma.repaymentPlan.aggregate({
        where: {
          status: { in: ["pending", "overdue"] },
          dueDate: { lt: day.start },
        },
        _count: { _all: true },
        _sum: { totalDue: true },
      }),
      prisma.repaymentPlan.findMany({
        where: {
          status: { in: ["pending", "overdue"] },
          dueDate: { gte: day.start, lt: day.end },
        },
        include: {
          order: {
            select: { id: true, orderNo: true, borrowerName: true },
          },
        },
        orderBy: { dueDate: "asc" },
        take: 20,
      }),
      prisma.repaymentPlan.findMany({
        where: {
          status: { in: ["pending", "overdue"] },
          dueDate: { lt: day.start },
        },
        include: {
          order: {
            select: { id: true, orderNo: true, borrowerName: true },
          },
        },
        orderBy: { dueDate: "asc" },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      data: {
        metrics: {
          totalAssets: toNumber(assetAgg._sum.currentBalance),
          outstandingPrincipal: toNumber(outstandingPrincipalAgg._sum.principalDue),
          monthlyExpectedInterest: toNumber(monthlyInterestAgg._sum.interestDue),
          todayDueCount: todayDueAgg._count._all,
          todayDueAmount: toNumber(todayDueAgg._sum.totalDue),
          overdueCount: overdueAgg._count._all,
          overdueAmount: toNumber(overdueAgg._sum.totalDue),
        },
        todayDuePlans,
        overduePlans,
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/summary failed", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to load dashboard summary" },
      { status: 500 },
    );
  }
}
