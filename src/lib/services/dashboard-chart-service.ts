import type { Prisma, PrismaClient } from "@prisma/client";

import type { DashboardChartRange } from "@/lib/api/dashboard-chart-query";
import { getUtcDayRange } from "@/lib/domain/date-ranges";

type DbClient = PrismaClient | Prisma.TransactionClient;

export interface DashboardAssetTrendPoint {
  date: string;
  totalAssets: number;
}

export interface DashboardAssetCompositionPoint {
  accountId: string;
  name: string;
  type: "cash" | "bank_card" | "wechat" | "alipay" | "other";
  currentBalance: number;
  share: number;
}

export interface DashboardDueStructurePoint {
  date: string;
  dueCount: number;
  dueAmount: number;
}

export interface DashboardChartsResult {
  range: DashboardChartRange;
  windowStart: string;
  windowEnd: string;
  assetTrend: DashboardAssetTrendPoint[];
  assetComposition: DashboardAssetCompositionPoint[];
  dueStructure: DashboardDueStructurePoint[];
}

export interface DashboardChartsInput {
  range: DashboardChartRange;
}

interface TransactionLike {
  occurredAt: Date;
  type: "inflow" | "outflow";
  amount: unknown;
}

interface RepaymentDueLike {
  dueDate: Date;
  totalDue: unknown;
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toIsoDateText(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function buildAssetTrendSeries(params: {
  windowStart: Date;
  windowEnd: Date;
  currentTotalAssets: number;
  transactions: TransactionLike[];
}): DashboardAssetTrendPoint[] {
  const { windowStart, windowEnd, currentTotalAssets, transactions } = params;
  const deltaByDay = new Map<string, number>();

  for (const tx of transactions) {
    const day = toIsoDateText(tx.occurredAt);
    const amount = toNumber(tx.amount);
    const delta = tx.type === "inflow" ? amount : -amount;
    deltaByDay.set(day, (deltaByDay.get(day) ?? 0) + delta);
  }

  const totalDelta = Array.from(deltaByDay.values()).reduce((sum, v) => sum + v, 0);
  let running = currentTotalAssets - totalDelta;

  const result: DashboardAssetTrendPoint[] = [];
  for (let cursor = new Date(windowStart); cursor < windowEnd; cursor = addUtcDays(cursor, 1)) {
    const dayText = toIsoDateText(cursor);
    running += deltaByDay.get(dayText) ?? 0;
    result.push({
      date: dayText,
      totalAssets: Math.round((running + Number.EPSILON) * 100) / 100,
    });
  }

  return result;
}

export function buildDueStructureSeries(params: {
  dayStart: Date;
  days: number;
  dues: RepaymentDueLike[];
}): DashboardDueStructurePoint[] {
  const { dayStart, days, dues } = params;
  const map = new Map<string, DashboardDueStructurePoint>();

  for (let i = 0; i < days; i += 1) {
    const date = addUtcDays(dayStart, i);
    map.set(toIsoDateText(date), {
      date: toIsoDateText(date),
      dueCount: 0,
      dueAmount: 0,
    });
  }

  for (const due of dues) {
    const day = toIsoDateText(due.dueDate);
    const bucket = map.get(day);
    if (!bucket) {
      continue;
    }
    bucket.dueCount += 1;
    bucket.dueAmount += toNumber(due.totalDue);
  }

  return Array.from(map.values());
}

export async function getDashboardCharts(
  prisma: DbClient,
  input: DashboardChartsInput,
  now: Date = new Date(),
): Promise<DashboardChartsResult> {
  const today = getUtcDayRange(now).start;

  const windowDays = input.range === "30d" ? 30 : 30;
  const windowStart = addUtcDays(today, -(windowDays - 1));
  const windowEnd = addUtcDays(today, 1);
  const dueWindowEnd = addUtcDays(today, 7);

  const [assetAgg, accounts, transactions, dues] = await Promise.all([
    prisma.account.aggregate({
      _sum: { currentBalance: true },
    }),
    prisma.account.findMany({
      orderBy: { currentBalance: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        currentBalance: true,
      },
    }),
    prisma.transaction.findMany({
      where: {
        occurredAt: {
          gte: windowStart,
          lt: windowEnd,
        },
      },
      select: {
        occurredAt: true,
        type: true,
        amount: true,
      },
      orderBy: { occurredAt: "asc" },
    }),
    prisma.repaymentPlan.findMany({
      where: {
        status: { in: ["pending", "overdue"] },
        dueDate: {
          gte: today,
          lt: dueWindowEnd,
        },
      },
      select: {
        dueDate: true,
        totalDue: true,
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const currentTotalAssets = toNumber(assetAgg._sum.currentBalance);
  const assetTrend = buildAssetTrendSeries({
    windowStart,
    windowEnd,
    currentTotalAssets,
    transactions,
  });

  const totalAssetBalance = accounts.reduce(
    (sum, account) => sum + toNumber(account.currentBalance),
    0,
  );

  const assetComposition: DashboardAssetCompositionPoint[] = accounts.map((account) => {
    const balance = toNumber(account.currentBalance);
    return {
      accountId: account.id,
      name: account.name,
      type: account.type,
      currentBalance: balance,
      share:
        totalAssetBalance > 0
          ? Math.round(((balance / totalAssetBalance) * 100 + Number.EPSILON) * 100) / 100
          : 0,
    };
  });

  const dueStructure = buildDueStructureSeries({
    dayStart: today,
    days: 7,
    dues,
  });

  return {
    range: input.range,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    assetTrend,
    assetComposition,
    dueStructure,
  };
}
