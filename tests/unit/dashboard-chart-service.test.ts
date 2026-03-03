import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAssetTrendSeries,
  buildDueStructureSeries,
} from "../../src/lib/services/dashboard-chart-service.ts";

test("buildAssetTrendSeries reconstructs 30d balances from current total and tx deltas", () => {
  const points = buildAssetTrendSeries({
    windowStart: new Date("2026-03-01T00:00:00.000Z"),
    windowEnd: new Date("2026-03-04T00:00:00.000Z"),
    currentTotalAssets: 1300,
    transactions: [
      { occurredAt: new Date("2026-03-01T10:00:00.000Z"), type: "inflow", amount: 100 },
      { occurredAt: new Date("2026-03-02T09:00:00.000Z"), type: "inflow", amount: 300 },
      { occurredAt: new Date("2026-03-03T12:00:00.000Z"), type: "outflow", amount: 100 },
    ],
  });

  assert.deepEqual(points, [
    { date: "2026-03-01", totalAssets: 1100 },
    { date: "2026-03-02", totalAssets: 1400 },
    { date: "2026-03-03", totalAssets: 1300 },
  ]);
});

test("buildDueStructureSeries aggregates due amount and count in next 7 days window", () => {
  const points = buildDueStructureSeries({
    dayStart: new Date("2026-03-10T00:00:00.000Z"),
    days: 3,
    dues: [
      { dueDate: new Date("2026-03-10T08:00:00.000Z"), totalDue: 100 },
      { dueDate: new Date("2026-03-12T08:00:00.000Z"), totalDue: 50 },
      { dueDate: new Date("2026-03-12T13:00:00.000Z"), totalDue: 80 },
      { dueDate: new Date("2026-03-20T08:00:00.000Z"), totalDue: 999 },
    ],
  });

  assert.deepEqual(points, [
    { date: "2026-03-10", dueCount: 1, dueAmount: 100 },
    { date: "2026-03-11", dueCount: 0, dueAmount: 0 },
    { date: "2026-03-12", dueCount: 2, dueAmount: 130 },
  ]);
});
