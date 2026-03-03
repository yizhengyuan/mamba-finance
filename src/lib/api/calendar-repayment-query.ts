import { PayloadValidationError } from "@/lib/api/payload-validation-error";
import type { RepaymentPlanStatusFilter } from "@/lib/api/repayment-plan-query";

export interface CalendarRepaymentQueryInput {
  month?: string;
  status?: string;
  keyword?: string;
}

export interface CalendarRepaymentQueryParsed {
  month: string;
  monthStart: Date;
  monthEnd: Date;
  status?: RepaymentPlanStatusFilter;
  keyword?: string;
}

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

function parseStatus(value: string | undefined): RepaymentPlanStatusFilter | undefined {
  if (!value || value.trim() === "") {
    return undefined;
  }

  if (value === "pending" || value === "paid" || value === "overdue") {
    return value;
  }

  throw new PayloadValidationError("status must be one of: pending, paid, overdue");
}

function parseMonthRange(monthValue: string | undefined, now: Date): {
  month: string;
  monthStart: Date;
  monthEnd: Date;
} {
  if (!monthValue || monthValue.trim() === "") {
    const year = now.getUTCFullYear();
    const monthIndex = now.getUTCMonth();
    const month = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    return {
      month,
      monthStart: new Date(Date.UTC(year, monthIndex, 1)),
      monthEnd: new Date(Date.UTC(year, monthIndex + 1, 1)),
    };
  }

  if (!MONTH_PATTERN.test(monthValue)) {
    throw new PayloadValidationError("month must be in format YYYY-MM");
  }

  const [yearText, monthText] = monthValue.split("-");
  const year = Number(yearText);
  const monthNum = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    throw new PayloadValidationError("month must be a valid calendar month");
  }

  const monthStart = new Date(Date.UTC(year, monthNum - 1, 1));
  const monthEnd = new Date(Date.UTC(year, monthNum, 1));

  return {
    month: `${year}-${String(monthNum).padStart(2, "0")}`,
    monthStart,
    monthEnd,
  };
}

function parseKeyword(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized === "") {
    return undefined;
  }

  if (normalized.length > 50) {
    throw new PayloadValidationError("keyword length must be <= 50");
  }

  return normalized;
}

export function parseCalendarRepaymentQuery(
  input: CalendarRepaymentQueryInput,
  now: Date = new Date(),
): CalendarRepaymentQueryParsed {
  const { month, monthStart, monthEnd } = parseMonthRange(input.month, now);

  return {
    month,
    monthStart,
    monthEnd,
    status: parseStatus(input.status),
    keyword: parseKeyword(input.keyword),
  };
}
