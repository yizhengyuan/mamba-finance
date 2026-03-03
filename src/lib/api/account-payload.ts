import { AccountType } from "@prisma/client";
import { PayloadValidationError } from "@/lib/api/payload-validation-error";

export { PayloadValidationError } from "@/lib/api/payload-validation-error";

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  openingBalance: number;
}

export interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
  isActive?: boolean;
}

const ACCOUNT_TYPES = new Set<AccountType>(Object.values(AccountType));

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function parseName(value: unknown, required: boolean): string | undefined {
  if (value === undefined && !required) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new PayloadValidationError("name must be a string");
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new PayloadValidationError("name cannot be empty");
  }

  return trimmed;
}

function parseType(value: unknown, required: boolean): AccountType | undefined {
  if (value === undefined && !required) {
    return undefined;
  }

  if (typeof value !== "string" || !ACCOUNT_TYPES.has(value as AccountType)) {
    throw new PayloadValidationError(
      "type must be one of: cash, bank_card, wechat, alipay, other",
    );
  }

  return value as AccountType;
}

function parseMoney(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new PayloadValidationError(`${field} must be a finite number`);
  }

  if (value < 0) {
    throw new PayloadValidationError(`${field} cannot be negative`);
  }

  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new PayloadValidationError(`${field} must be a boolean`);
  }

  return value;
}

export function parseCreateAccountPayload(payload: unknown): CreateAccountInput {
  const obj = asObject(payload);
  if (!obj) {
    throw new PayloadValidationError("request body must be a JSON object");
  }

  return {
    name: parseName(obj.name, true) as string,
    type: parseType(obj.type, true) as AccountType,
    openingBalance: parseMoney(obj.openingBalance, "openingBalance"),
  };
}

export function parseUpdateAccountPayload(payload: unknown): UpdateAccountInput {
  const obj = asObject(payload);
  if (!obj) {
    throw new PayloadValidationError("request body must be a JSON object");
  }

  const parsed: UpdateAccountInput = {
    name: parseName(obj.name, false),
    type: parseType(obj.type, false),
    isActive:
      obj.isActive === undefined ? undefined : parseBoolean(obj.isActive, "isActive"),
  };

  if (Object.values(parsed).every((value) => value === undefined)) {
    throw new PayloadValidationError(
      "at least one field is required: name, type, isActive",
    );
  }

  return parsed;
}
