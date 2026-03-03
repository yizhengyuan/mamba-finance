import assert from "node:assert/strict";
import test from "node:test";

import { buildDailyBrief } from "../../src/lib/services/daily-brief-service.ts";

test("buildDailyBrief returns headline and risk bullets", () => {
  const result = buildDailyBrief({
    generatedAt: new Date("2026-03-04T01:00:00.000Z"),
    todayDueCount: 2,
    todayDueAmount: 1500,
    overdueCount: 1,
    overdueAmount: 800,
    topDue: [
      {
        dueDate: new Date("2026-03-04T00:00:00.000Z"),
        totalDue: 1000,
        order: { borrowerName: "张三", orderNo: "ORD-1" },
      },
    ],
    topOverdue: [
      {
        dueDate: new Date("2026-03-01T00:00:00.000Z"),
        totalDue: 800,
        order: { borrowerName: "李四", orderNo: "ORD-2" },
      },
    ],
  });

  assert.equal(result.headline, "每日经营简报");
  assert.equal(result.bullets.length, 3);
  assert.match(result.bullets[0] ?? "", /今日到期 2 笔/);
  assert.match(result.bullets[1] ?? "", /张三/);
  assert.match(result.bullets[2] ?? "", /逾期提醒/);
});

test("buildDailyBrief falls back to safe text when no overdue", () => {
  const result = buildDailyBrief({
    generatedAt: new Date("2026-03-04T01:00:00.000Z"),
    todayDueCount: 0,
    todayDueAmount: 0,
    overdueCount: 0,
    overdueAmount: 0,
    topDue: [],
    topOverdue: [],
  });

  assert.equal(result.bullets.length, 2);
  assert.match(result.bullets[1] ?? "", /逾期风险可控/);
});
