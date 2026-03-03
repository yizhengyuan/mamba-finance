import assert from "node:assert/strict";
import test from "node:test";

import {
  parseCreateAccountPayload,
  parseUpdateAccountPayload,
  PayloadValidationError,
} from "../../src/lib/api/account-payload.ts";

test("parseCreateAccountPayload parses valid payload", () => {
  const parsed = parseCreateAccountPayload({
    name: "  现金账户  ",
    type: "cash",
    openingBalance: 123.456,
  });

  assert.deepEqual(parsed, {
    name: "现金账户",
    type: "cash",
    openingBalance: 123.46,
  });
});

test("parseCreateAccountPayload rejects invalid type", () => {
  assert.throws(
    () =>
      parseCreateAccountPayload({
        name: "A",
        type: "foo",
        openingBalance: 1,
      }),
    PayloadValidationError,
  );
});

test("parseUpdateAccountPayload parses partial payload", () => {
  const parsed = parseUpdateAccountPayload({ isActive: false });
  assert.deepEqual(parsed, { name: undefined, type: undefined, isActive: false });
});

test("parseUpdateAccountPayload requires at least one field", () => {
  assert.throws(() => parseUpdateAccountPayload({}), PayloadValidationError);
});
