import assert from "node:assert/strict";
import test from "node:test";

import { parseCollectRepaymentPayload } from "../../src/lib/api/collect-payload.ts";
import { PayloadValidationError } from "../../src/lib/api/payload-validation-error.ts";

test("parseCollectRepaymentPayload parses valid payload", () => {
  const parsed = parseCollectRepaymentPayload({
    accountId: "  acc_123 ",
    amount: 10100.236,
    occurredAt: "2026-03-10T10:30:00+08:00",
    note: "  3月回款  ",
  });

  assert.equal(parsed.accountId, "acc_123");
  assert.equal(parsed.amount, 10100.24);
  assert.equal(parsed.occurredAt.toISOString(), "2026-03-10T02:30:00.000Z");
  assert.equal(parsed.note, "3月回款");
});

test("parseCollectRepaymentPayload rejects non-positive amount", () => {
  assert.throws(
    () =>
      parseCollectRepaymentPayload({
        accountId: "acc_123",
        amount: 0,
        occurredAt: "2026-03-10T10:30:00+08:00",
      }),
    PayloadValidationError,
  );
});

test("parseCollectRepaymentPayload rejects invalid occurredAt", () => {
  assert.throws(
    () =>
      parseCollectRepaymentPayload({
        accountId: "acc_123",
        amount: 100,
        occurredAt: "not-date",
      }),
    PayloadValidationError,
  );
});
