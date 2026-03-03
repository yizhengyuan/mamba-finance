import test from "node:test";
import assert from "node:assert/strict";

import {
  addMonthsWithAnchor,
  generateRepaymentPlans,
} from "../../src/lib/domain/repayment-plan-generator.ts";

test("addMonthsWithAnchor handles month-end anchor in non-leap year", () => {
  const start = new Date("2025-01-31T00:00:00.000Z");
  const due = addMonthsWithAnchor(start, 1);

  assert.equal(due.toISOString(), "2025-02-28T00:00:00.000Z");
});

test("addMonthsWithAnchor handles leap year February", () => {
  const start = new Date("2024-01-31T00:00:00.000Z");
  const due = addMonthsWithAnchor(start, 1);

  assert.equal(due.toISOString(), "2024-02-29T00:00:00.000Z");
});

test("generateRepaymentPlans follows interest-only then final principal+interest", () => {
  const plans = generateRepaymentPlans({
    principal: 10000,
    monthlyRate: 0.01,
    startDate: new Date("2026-02-10T00:00:00.000Z"),
    months: 3,
  });

  assert.equal(plans.length, 3);
  assert.deepEqual(
    plans.map((p) => ({
      periodIndex: p.periodIndex,
      dueDate: p.dueDate.toISOString().slice(0, 10),
      principalDue: p.principalDue,
      interestDue: p.interestDue,
      totalDue: p.totalDue,
      status: p.status,
    })),
    [
      {
        periodIndex: 1,
        dueDate: "2026-03-10",
        principalDue: 0,
        interestDue: 100,
        totalDue: 100,
        status: "pending",
      },
      {
        periodIndex: 2,
        dueDate: "2026-04-10",
        principalDue: 0,
        interestDue: 100,
        totalDue: 100,
        status: "pending",
      },
      {
        periodIndex: 3,
        dueDate: "2026-05-10",
        principalDue: 10000,
        interestDue: 100,
        totalDue: 10100,
        status: "pending",
      },
    ],
  );
});

test("generateRepaymentPlans rounds to 2 decimals", () => {
  const plans = generateRepaymentPlans({
    principal: 12345.67,
    monthlyRate: 0.013333,
    startDate: new Date("2026-03-01T00:00:00.000Z"),
    months: 1,
  });

  assert.equal(plans[0]?.interestDue, 164.6);
  assert.equal(plans[0]?.totalDue, 12510.27);
});
