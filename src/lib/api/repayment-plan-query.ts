import { PayloadValidationError } from "@/lib/api/payload-validation-error";

export type RepaymentPlanStatusFilter = "pending" | "paid" | "overdue";

export interface RepaymentPlanQueryInput {
  date?: string;
  status?: string;
}

export interface RepaymentPlanQueryParsed {
  dateStart?: Date;
  dateEnd?: Date;
  status?: RepaymentPlanStatusFilter;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseStatus(value: string | null): RepaymentPlanStatusFilter | undefined {
  if (value === null || value.trim() === "") {
    return undefined;
  }

  if (value === "pending" || value === "paid" || value === "overdue") {
    return value;
  }

  throw new PayloadValidationError("status must be one of: pending, paid, overdue");
}

function parseDateRange(dateValue: string | undefined): {
  dateStart?: Date;
  dateEnd?: Date;
} {
  if (!dateValue) {
    return {};
  }

  if (!DATE_PATTERN.test(dateValue)) {
    throw new PayloadValidationError("date must be in format YYYY-MM-DD");
  }

  const start = new Date(`${dateValue}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    throw new PayloadValidationError("date must be a valid calendar date");
  }

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { dateStart: start, dateEnd: end };
}

export function parseRepaymentPlanQuery(
  input: RepaymentPlanQueryInput,
): RepaymentPlanQueryParsed {
  const status = parseStatus(input.status ?? null);
  const { dateStart, dateEnd } = parseDateRange(input.date);

  return {
    status,
    dateStart,
    dateEnd,
  };
}
