import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveOrderStatus,
  derivePlanStatus,
} from "../../src/lib/domain/order-status-machine.ts";

test("deriveOrderStatus returns closed when all plans are paid", () => {
  const now = new Date("2026-03-04T00:00:00.000Z");
  const status = deriveOrderStatus({
    now,
    plans: [
      { dueDate: new Date("2026-01-01T00:00:00.000Z"), status: "paid" },
      { dueDate: new Date("2026-02-01T00:00:00.000Z"), status: "paid" },
    ],
  });

  assert.equal(status, "closed");
});

test("deriveOrderStatus returns overdue when at least one unpaid plan is due", () => {
  const now = new Date("2026-03-04T00:00:00.000Z");
  const status = deriveOrderStatus({
    now,
    plans: [
      { dueDate: new Date("2026-03-01T00:00:00.000Z"), status: "pending" },
      { dueDate: new Date("2026-04-01T00:00:00.000Z"), status: "pending" },
    ],
  });

  assert.equal(status, "overdue");
});

test("deriveOrderStatus returns active when unpaid plans are not due yet", () => {
  const now = new Date("2026-03-04T00:00:00.000Z");
  const status = deriveOrderStatus({
    now,
    plans: [
      { dueDate: new Date("2026-03-05T00:00:00.000Z"), status: "pending" },
      { dueDate: new Date("2026-04-01T00:00:00.000Z"), status: "pending" },
    ],
  });

  assert.equal(status, "active");
});

test("deriveOrderStatus keeps closed irreversible for MVP", () => {
  const now = new Date("2026-03-04T00:00:00.000Z");
  const status = deriveOrderStatus({
    now,
    currentStatus: "closed",
    plans: [{ dueDate: new Date("2026-03-01T00:00:00.000Z"), status: "pending" }],
  });

  assert.equal(status, "closed");
});

test("derivePlanStatus maps unpaid plans to pending/overdue", () => {
  const now = new Date("2026-03-04T00:00:00.000Z");

  assert.equal(
    derivePlanStatus({ dueDate: new Date("2026-03-05T00:00:00.000Z"), status: "pending" }, now),
    "pending",
  );

  assert.equal(
    derivePlanStatus({ dueDate: new Date("2026-03-01T00:00:00.000Z"), status: "pending" }, now),
    "overdue",
  );

  assert.equal(
    derivePlanStatus({ dueDate: new Date("2026-03-01T00:00:00.000Z"), status: "paid" }, now),
    "paid",
  );
});
