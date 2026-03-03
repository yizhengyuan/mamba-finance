import { PayloadValidationError } from "@/lib/api/payload-validation-error";

export interface CreateOrderInput {
  borrowerName: string;
  borrowerPhone?: string;
  principal: number;
  monthlyRate: number;
  startDate: Date;
  months: number;
  collateralDesc?: string;
  notes?: string;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function parseRequiredString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new PayloadValidationError(`${field} must be a string`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new PayloadValidationError(`${field} cannot be empty`);
  }

  return trimmed;
}

function parseOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new PayloadValidationError(`${field} must be a string`);
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parsePositiveMoney(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new PayloadValidationError(`${field} must be a finite number`);
  }

  if (value <= 0) {
    throw new PayloadValidationError(`${field} must be greater than 0`);
  }

  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseRate(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new PayloadValidationError("monthlyRate must be a finite number");
  }

  if (value <= 0 || value > 1) {
    throw new PayloadValidationError("monthlyRate must be between 0 and 1");
  }

  return value;
}

function parseMonths(value: unknown): number {
  if (!Number.isInteger(value)) {
    throw new PayloadValidationError("months must be an integer");
  }

  if ((value as number) < 1) {
    throw new PayloadValidationError("months must be greater than or equal to 1");
  }

  return value as number;
}

function parseStartDate(value: unknown): Date {
  if (typeof value !== "string") {
    throw new PayloadValidationError("startDate must be an ISO date string");
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new PayloadValidationError("startDate must be a valid date string");
  }

  return parsed;
}

export function parseCreateOrderPayload(payload: unknown): CreateOrderInput {
  const obj = asObject(payload);
  if (!obj) {
    throw new PayloadValidationError("request body must be a JSON object");
  }

  return {
    borrowerName: parseRequiredString(obj.borrowerName, "borrowerName"),
    borrowerPhone: parseOptionalString(obj.borrowerPhone, "borrowerPhone"),
    principal: parsePositiveMoney(obj.principal, "principal"),
    monthlyRate: parseRate(obj.monthlyRate),
    startDate: parseStartDate(obj.startDate),
    months: parseMonths(obj.months),
    collateralDesc: parseOptionalString(obj.collateralDesc, "collateralDesc"),
    notes: parseOptionalString(obj.notes, "notes"),
  };
}
