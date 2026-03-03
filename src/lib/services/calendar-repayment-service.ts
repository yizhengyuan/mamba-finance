import type { Prisma, PrismaClient } from "@prisma/client";

import type { RepaymentPlanStatusFilter } from "@/lib/api/repayment-plan-query";

type DbClient = PrismaClient | Prisma.TransactionClient;

export interface CalendarRepaymentPlan {
  id: string;
  orderId: string;
  periodIndex: number;
  dueDate: string;
  status: "pending" | "paid" | "overdue";
  principalDue: number;
  interestDue: number;
  totalDue: number;
  order: {
    id: string;
    orderNo: string;
    borrowerName: string;
    status: "active" | "closed" | "overdue";
  };
}

export interface CalendarDay {
  date: string;
  dueCount: number;
  dueAmount: number;
  overdueCount: number;
  plans: CalendarRepaymentPlan[];
}

export interface CalendarRepaymentSummary {
  dueCount: number;
  dueAmount: number;
  overdueCount: number;
  overdueAmount: number;
}

export interface CalendarRepaymentResult {
  month: string;
  monthStart: string;
  monthEnd: string;
  filters: {
    status?: RepaymentPlanStatusFilter;
    keyword?: string;
  };
  summary: CalendarRepaymentSummary;
  days: CalendarDay[];
}

export interface CalendarRepaymentInput {
  month: string;
  monthStart: Date;
  monthEnd: Date;
  status?: RepaymentPlanStatusFilter;
  keyword?: string;
}

interface RepaymentPlanRecord {
  id: string;
  orderId: string;
  periodIndex: number;
  dueDate: Date;
  status: "pending" | "paid" | "overdue";
  principalDue: unknown;
  interestDue: unknown;
  totalDue: unknown;
  order: {
    id: string;
    orderNo: string;
    borrowerName: string;
    status: "active" | "closed" | "overdue";
  };
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoDateText(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getDaysInUtcMonth(monthStart: Date): number {
  return new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0),
  ).getUTCDate();
}

function createDayBucket(date: string): CalendarDay {
  return {
    date,
    dueCount: 0,
    dueAmount: 0,
    overdueCount: 0,
    plans: [],
  };
}

function isPlanOverdue(
  plan: RepaymentPlanRecord,
  now: Date,
): boolean {
  return plan.status === "overdue" || (plan.status !== "paid" && plan.dueDate < now);
}

function buildStatusWhere(
  status: RepaymentPlanStatusFilter | undefined,
  now: Date,
): Prisma.RepaymentPlanWhereInput {
  if (!status) {
    return {};
  }

  if (status === "overdue") {
    return {
      status: { in: ["pending", "overdue"] },
      dueDate: { lt: now },
    };
  }

  return { status };
}

export function buildCalendarDays(
  monthStart: Date,
  plans: RepaymentPlanRecord[],
  now: Date,
): { days: CalendarDay[]; summary: CalendarRepaymentSummary } {
  const daysInMonth = getDaysInUtcMonth(monthStart);
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(
      Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), index + 1),
    );
    return createDayBucket(toIsoDateText(date));
  });

  const summary: CalendarRepaymentSummary = {
    dueCount: 0,
    dueAmount: 0,
    overdueCount: 0,
    overdueAmount: 0,
  };

  for (const plan of plans) {
    const dayIndex = plan.dueDate.getUTCDate() - 1;
    const bucket = days[dayIndex];
    if (!bucket) {
      continue;
    }

    const principalDue = toNumber(plan.principalDue);
    const interestDue = toNumber(plan.interestDue);
    const totalDue = toNumber(plan.totalDue);
    const overdue = isPlanOverdue(plan, now);

    bucket.dueCount += 1;
    bucket.dueAmount += totalDue;
    if (overdue) {
      bucket.overdueCount += 1;
    }
    summary.dueCount += 1;
    summary.dueAmount += totalDue;
    if (overdue) {
      summary.overdueCount += 1;
      summary.overdueAmount += totalDue;
    }

    bucket.plans.push({
      id: plan.id,
      orderId: plan.orderId,
      periodIndex: plan.periodIndex,
      dueDate: plan.dueDate.toISOString(),
      status: plan.status,
      principalDue,
      interestDue,
      totalDue,
      order: plan.order,
    });
  }

  return { days, summary };
}

export async function getCalendarRepayments(
  prisma: DbClient,
  input: CalendarRepaymentInput,
  now: Date = new Date(),
): Promise<CalendarRepaymentResult> {
  const where: Prisma.RepaymentPlanWhereInput = {
    dueDate: {
      gte: input.monthStart,
      lt: input.monthEnd,
    },
    ...buildStatusWhere(input.status, now),
    ...(input.keyword
      ? {
          order: {
            borrowerName: {
              contains: input.keyword,
            },
          },
        }
      : {}),
  };

  const plans = await prisma.repaymentPlan.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { periodIndex: "asc" }],
    select: {
      id: true,
      orderId: true,
      periodIndex: true,
      dueDate: true,
      status: true,
      principalDue: true,
      interestDue: true,
      totalDue: true,
      order: {
        select: {
          id: true,
          orderNo: true,
          borrowerName: true,
          status: true,
        },
      },
    },
  });

  const { days, summary } = buildCalendarDays(input.monthStart, plans, now);

  return {
    month: input.month,
    monthStart: input.monthStart.toISOString(),
    monthEnd: input.monthEnd.toISOString(),
    filters: {
      status: input.status,
      keyword: input.keyword,
    },
    summary,
    days,
  };
}
