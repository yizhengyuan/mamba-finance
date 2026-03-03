import assert from "node:assert/strict";
import test from "node:test";

import { parseCreateOrderPayload } from "../../src/lib/api/order-payload.ts";
import { PayloadValidationError } from "../../src/lib/api/payload-validation-error.ts";

test("parseCreateOrderPayload parses valid payload", () => {
  const parsed = parseCreateOrderPayload({
    borrowerName: "  张三  ",
    borrowerPhone: " 13800000000 ",
    principal: 10000.126,
    monthlyRate: 0.01,
    startDate: "2026-03-10T00:00:00.000Z",
    months: 3,
    collateralDesc: "  金饰 ",
    notes: "  测试订单 ",
  });

  assert.equal(parsed.borrowerName, "张三");
  assert.equal(parsed.borrowerPhone, "13800000000");
  assert.equal(parsed.principal, 10000.13);
  assert.equal(parsed.monthlyRate, 0.01);
  assert.equal(parsed.startDate.toISOString(), "2026-03-10T00:00:00.000Z");
  assert.equal(parsed.months, 3);
  assert.equal(parsed.collateralDesc, "金饰");
  assert.equal(parsed.notes, "测试订单");
});

test("parseCreateOrderPayload rejects invalid monthlyRate", () => {
  assert.throws(
    () =>
      parseCreateOrderPayload({
        borrowerName: "张三",
        principal: 1000,
        monthlyRate: 1.2,
        startDate: "2026-03-10",
        months: 1,
      }),
    PayloadValidationError,
  );
});

test("parseCreateOrderPayload rejects non-integer months", () => {
  assert.throws(
    () =>
      parseCreateOrderPayload({
        borrowerName: "张三",
        principal: 1000,
        monthlyRate: 0.01,
        startDate: "2026-03-10",
        months: 1.5,
      }),
    PayloadValidationError,
  );
});
