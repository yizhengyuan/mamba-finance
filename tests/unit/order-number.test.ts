import assert from "node:assert/strict";
import test from "node:test";

import { generateOrderNo } from "../../src/lib/domain/order-number.ts";

test("generateOrderNo uses ORD prefix and UTC timestamp pattern", () => {
  const now = new Date("2026-03-04T01:23:45.000Z");
  const orderNo = generateOrderNo(now);

  assert.match(orderNo, /^ORD-20260304-012345-\d{4}$/);
});
