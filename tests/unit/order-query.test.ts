import assert from "node:assert/strict";
import test from "node:test";

import { parseOrderStatusFilter } from "../../src/lib/api/order-payload.ts";
import { PayloadValidationError } from "../../src/lib/api/payload-validation-error.ts";

test("parseOrderStatusFilter returns undefined for empty input", () => {
  assert.equal(parseOrderStatusFilter(null), undefined);
  assert.equal(parseOrderStatusFilter(""), undefined);
  assert.equal(parseOrderStatusFilter("   "), undefined);
});

test("parseOrderStatusFilter accepts valid statuses", () => {
  assert.equal(parseOrderStatusFilter("active"), "active");
  assert.equal(parseOrderStatusFilter("overdue"), "overdue");
  assert.equal(parseOrderStatusFilter("closed"), "closed");
});

test("parseOrderStatusFilter rejects invalid status", () => {
  assert.throws(() => parseOrderStatusFilter("foo"), PayloadValidationError);
});
