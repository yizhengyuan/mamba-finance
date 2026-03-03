interface ErrorLike {
  name?: string;
  message?: string;
  stack?: string;
}

function toErrorLike(error: unknown): ErrorLike {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "object" && error !== null) {
    return error as ErrorLike;
  }

  return { message: String(error) };
}

export function logBusinessEvent(
  event: string,
  payload: Record<string, unknown>,
): void {
  console.info(
    JSON.stringify({
      type: "business_event",
      event,
      timestamp: new Date().toISOString(),
      ...payload,
    }),
  );
}

export function logApiError(
  route: string,
  error: unknown,
  payload: Record<string, unknown> = {},
): void {
  const normalized = toErrorLike(error);
  console.error(
    JSON.stringify({
      type: "api_error",
      route,
      timestamp: new Date().toISOString(),
      errorName: normalized.name ?? "UnknownError",
      errorMessage: normalized.message ?? "unknown",
      stack: normalized.stack,
      ...payload,
    }),
  );
}
