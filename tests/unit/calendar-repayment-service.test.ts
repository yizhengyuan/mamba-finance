import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCalendarDays,
  getCalendarRepayments,
} from "../../src/lib/services/calendar-repayment-service.ts";

test("buildCalendarDays aggregates day stats and overdue summary", () => {
  const monthStart = new Date("2026-03-01T00:00:00.000Z");
  const now = new Date("2026-03-20T00:00:00.000Z");

  const plans = [
    {
      id: "plan-1",
      orderId: "ord-1",
      periodIndex: 1,
      dueDate: new Date("2026-03-10T00:00:00.000Z"),
      status: "pending" as const,
      principalDue: 1000,
      interestDue: 10,
      totalDue: 1010,
      order: {
        id: "ord-1",
        orderNo: "ORD-1",
        borrowerName: "A",
        status: "active" as const,
      },
    },
    {
      id: "plan-2",
      orderId: "ord-2",
      periodIndex: 2,
      dueDate: new Date("2026-03-21T00:00:00.000Z"),
      status: "overdue" as const,
      principalDue: 0,
      interestDue: 80,
      totalDue: 80,
      order: {
        id: "ord-2",
        orderNo: "ORD-2",
        borrowerName: "B",
        status: "overdue" as const,
      },
    },
    {
      id: "plan-3",
      orderId: "ord-3",
      periodIndex: 3,
      dueDate: new Date("2026-03-25T00:00:00.000Z"),
      status: "paid" as const,
      principalDue: 0,
      interestDue: 100,
      totalDue: 100,
      order: {
        id: "ord-3",
        orderNo: "ORD-3",
        borrowerName: "C",
        status: "closed" as const,
      },
    },
  ];

  const { days, summary } = buildCalendarDays(monthStart, plans, now);

  assert.equal(days.length, 31);
  assert.equal(days[9]?.dueCount, 1);
  assert.equal(days[9]?.dueAmount, 1010);
  assert.equal(days[9]?.overdueCount, 1);
  assert.equal(days[20]?.overdueCount, 1);
  assert.equal(days[24]?.overdueCount, 0);

  assert.equal(summary.dueCount, 3);
  assert.equal(summary.dueAmount, 1190);
  assert.equal(summary.overdueCount, 2);
  assert.equal(summary.overdueAmount, 1090);
});

test("buildCalendarDays keeps leap-year month day count", () => {
  const { days } = buildCalendarDays(
    new Date("2024-02-01T00:00:00.000Z"),
    [],
    new Date("2024-02-15T00:00:00.000Z"),
  );

  assert.equal(days.length, 29);
});

test("getCalendarRepayments builds overdue+keyword where clause", async () => {
  let capturedWhere: unknown;

  const mockPrisma = {
    repaymentPlan: {
      findMany: async (args: { where: unknown }) => {
        capturedWhere = args.where;
        return [];
      },
    },
  };

  const now = new Date("2026-03-20T12:00:00.000Z");

  await getCalendarRepayments(
    mockPrisma as never,
    {
      month: "2026-03",
      monthStart: new Date("2026-03-01T00:00:00.000Z"),
      monthEnd: new Date("2026-04-01T00:00:00.000Z"),
      status: "overdue",
      keyword: "张三",
    },
    now,
  );

  assert.deepEqual(capturedWhere, {
    dueDate: {
      gte: new Date("2026-03-01T00:00:00.000Z"),
      lt: now,
    },
    status: { in: ["pending", "overdue"] },
    order: {
      borrowerName: {
        contains: "张三",
      },
    },
  });
});
