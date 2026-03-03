import { PayloadValidationError } from "@/lib/api/payload-validation-error";

export type DashboardChartRange = "30d";

export interface DashboardChartQueryInput {
  range?: string;
}

export interface DashboardChartQueryParsed {
  range: DashboardChartRange;
}

export function parseDashboardChartQuery(
  input: DashboardChartQueryInput,
): DashboardChartQueryParsed {
  if (!input.range || input.range.trim() === "") {
    return { range: "30d" };
  }

  if (input.range === "30d") {
    return { range: "30d" };
  }

  throw new PayloadValidationError("range must be: 30d");
}
