import { PayloadValidationError } from "@/lib/api/payload-validation-error";

export interface CollectRepaymentInput {
  accountId: string;
  amount: number;
  occurredAt: Date;
  note?: string;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function parseNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new PayloadValidationError(`${field} must be a string`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new PayloadValidationError(`${field} cannot be empty`);
  }

  return trimmed;
}

function parseAmount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new PayloadValidationError("amount must be a finite number");
  }

  if (value <= 0) {
    throw new PayloadValidationError("amount must be greater than 0");
  }

  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseOccurredAt(value: unknown): Date {
  if (typeof value !== "string") {
    throw new PayloadValidationError("occurredAt must be an ISO date string");
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new PayloadValidationError("occurredAt must be a valid date string");
  }

  return parsed;
}

function parseOptionalNote(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new PayloadValidationError("note must be a string");
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function parseCollectRepaymentPayload(
  payload: unknown,
): CollectRepaymentInput {
  const obj = asObject(payload);
  if (!obj) {
    throw new PayloadValidationError("request body must be a JSON object");
  }

  return {
    accountId: parseNonEmptyString(obj.accountId, "accountId"),
    amount: parseAmount(obj.amount),
    occurredAt: parseOccurredAt(obj.occurredAt),
    note: parseOptionalNote(obj.note),
  };
}
