import assert from "node:assert/strict";
import test from "node:test";

import { getUtcDayRange, getUtcMonthRange } from "../../src/lib/domain/date-ranges.ts";

test("getUtcDayRange returns midnight-to-midnight range", () => {
  const base = new Date("2026-03-04T15:23:00.000Z");
  const range = getUtcDayRange(base);

  assert.equal(range.start.toISOString(), "2026-03-04T00:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-03-05T00:00:00.000Z");
});

test("getUtcMonthRange returns month boundaries", () => {
  const base = new Date("2026-03-04T15:23:00.000Z");
  const range = getUtcMonthRange(base);

  assert.equal(range.start.toISOString(), "2026-03-01T00:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-04-01T00:00:00.000Z");
});
