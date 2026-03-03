import assert from "node:assert/strict";
import test from "node:test";

import { parseRepaymentPlanQuery } from "../../src/lib/api/repayment-plan-query.ts";
import { PayloadValidationError } from "../../src/lib/api/payload-validation-error.ts";

test("parseRepaymentPlanQuery parses date range and status", () => {
  const parsed = parseRepaymentPlanQuery({
    date: "2026-03-04",
    status: "pending",
  });

  assert.equal(parsed.status, "pending");
  assert.equal(parsed.dateStart?.toISOString(), "2026-03-04T00:00:00.000Z");
  assert.equal(parsed.dateEnd?.toISOString(), "2026-03-05T00:00:00.000Z");
});

test("parseRepaymentPlanQuery accepts empty query", () => {
  const parsed = parseRepaymentPlanQuery({});

  assert.equal(parsed.status, undefined);
  assert.equal(parsed.dateStart, undefined);
  assert.equal(parsed.dateEnd, undefined);
});

test("parseRepaymentPlanQuery rejects invalid status", () => {
  assert.throws(
    () => parseRepaymentPlanQuery({ status: "foo" }),
    PayloadValidationError,
  );
});

test("parseRepaymentPlanQuery rejects malformed date", () => {
  assert.throws(
    () => parseRepaymentPlanQuery({ date: "2026/03/04" }),
    PayloadValidationError,
  );
});
