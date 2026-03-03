import type { Prisma, PrismaClient } from "@prisma/client";

import { getUtcDayRange } from "@/lib/domain/date-ranges";

type DbClient = PrismaClient | Prisma.TransactionClient;

interface BriefPlanItem {
  dueDate: Date;
  totalDue: unknown;
  order: {
    borrowerName: string;
    orderNo: string;
  };
}

export interface DailyBriefResult {
  generatedAt: string;
  headline: string;
  bullets: string[];
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function money(value: number): string {
  return `¥${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function buildDailyBrief(params: {
  generatedAt: Date;
  todayDueCount: number;
  todayDueAmount: number;
  overdueCount: number;
  overdueAmount: number;
  topDue: BriefPlanItem[];
  topOverdue: BriefPlanItem[];
}): DailyBriefResult {
  const bullets: string[] = [];

  bullets.push(
    `今日到期 ${params.todayDueCount} 笔，应收 ${money(params.todayDueAmount)}；逾期 ${params.overdueCount} 笔，逾期金额 ${money(params.overdueAmount)}。`,
  );

  if (params.topDue.length > 0) {
    const text = params.topDue
      .map((plan) => `${plan.order.borrowerName}(${money(toNumber(plan.totalDue))})`)
      .join("、");
    bullets.push(`今日重点跟进：${text}。`);
  }

  if (params.topOverdue.length > 0) {
    const text = params.topOverdue
      .map(
        (plan) =>
          `${plan.order.borrowerName} ${fmtDate(plan.dueDate)} 到期，未收 ${money(toNumber(plan.totalDue))}`,
      )
      .join("；");
    bullets.push(`逾期提醒：${text}。`);
  } else {
    bullets.push("逾期风险可控，今日无新增高风险逾期项。");
  }

  return {
    generatedAt: params.generatedAt.toISOString(),
    headline: "每日经营简报",
    bullets,
  };
}

export async function getDailyBrief(
  prisma: DbClient,
  now: Date = new Date(),
): Promise<DailyBriefResult> {
  const day = getUtcDayRange(now);

  const [todayDueAgg, overdueAgg, topDue, topOverdue] = await Promise.all([
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
        order: { select: { borrowerName: true, orderNo: true } },
      },
      orderBy: [{ totalDue: "desc" }, { dueDate: "asc" }],
      take: 3,
    }),
    prisma.repaymentPlan.findMany({
      where: {
        status: { in: ["pending", "overdue"] },
        dueDate: { lt: day.start },
      },
      include: {
        order: { select: { borrowerName: true, orderNo: true } },
      },
      orderBy: [{ dueDate: "asc" }, { totalDue: "desc" }],
      take: 3,
    }),
  ]);

  return buildDailyBrief({
    generatedAt: now,
    todayDueCount: todayDueAgg._count._all,
    todayDueAmount: toNumber(todayDueAgg._sum.totalDue),
    overdueCount: overdueAgg._count._all,
    overdueAmount: toNumber(overdueAgg._sum.totalDue),
    topDue,
    topOverdue,
  });
}
