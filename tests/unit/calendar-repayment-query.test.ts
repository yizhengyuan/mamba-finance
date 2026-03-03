import assert from "node:assert/strict";
import test from "node:test";

import { parseCalendarRepaymentQuery } from "../../src/lib/api/calendar-repayment-query.ts";
import { PayloadValidationError } from "../../src/lib/api/payload-validation-error.ts";

test("parseCalendarRepaymentQuery parses valid month/status/keyword", () => {
  const parsed = parseCalendarRepaymentQuery(
    {
      month: "2026-03",
      status: "pending",
      keyword: "  张三  ",
    },
    new Date("2026-02-01T00:00:00.000Z"),
  );

  assert.equal(parsed.month, "2026-03");
  assert.equal(parsed.monthStart.toISOString(), "2026-03-01T00:00:00.000Z");
  assert.equal(parsed.monthEnd.toISOString(), "2026-04-01T00:00:00.000Z");
  assert.equal(parsed.status, "pending");
  assert.equal(parsed.keyword, "张三");
});

test("parseCalendarRepaymentQuery defaults month to current UTC month", () => {
  const parsed = parseCalendarRepaymentQuery(
    {},
    new Date("2026-11-18T10:00:00.000Z"),
  );

  assert.equal(parsed.month, "2026-11");
  assert.equal(parsed.monthStart.toISOString(), "2026-11-01T00:00:00.000Z");
  assert.equal(parsed.monthEnd.toISOString(), "2026-12-01T00:00:00.000Z");
});

test("parseCalendarRepaymentQuery rejects malformed month", () => {
  assert.throws(
    () => parseCalendarRepaymentQuery({ month: "2026/03" }),
    PayloadValidationError,
  );
});

test("parseCalendarRepaymentQuery rejects invalid status", () => {
  assert.throws(
    () => parseCalendarRepaymentQuery({ status: "foo" }),
    PayloadValidationError,
  );
});
