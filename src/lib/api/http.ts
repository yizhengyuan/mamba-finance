import { NextResponse } from "next/server";

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
}

export function ok<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ data }, { status });
}

export function fail(
  code: string,
  message: string,
  status: number,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ error: code, message }, { status });
}
