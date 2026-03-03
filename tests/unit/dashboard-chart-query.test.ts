import assert from "node:assert/strict";
import test from "node:test";

import { parseDashboardChartQuery } from "../../src/lib/api/dashboard-chart-query.ts";
import { PayloadValidationError } from "../../src/lib/api/payload-validation-error.ts";

test("parseDashboardChartQuery defaults to 30d", () => {
  const parsed = parseDashboardChartQuery({});
  assert.equal(parsed.range, "30d");
});

test("parseDashboardChartQuery accepts 30d", () => {
  const parsed = parseDashboardChartQuery({ range: "30d" });
  assert.equal(parsed.range, "30d");
});

test("parseDashboardChartQuery rejects unsupported range", () => {
  assert.throws(
    () => parseDashboardChartQuery({ range: "7d" }),
    PayloadValidationError,
  );
});
