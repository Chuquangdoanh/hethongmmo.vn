import { NextResponse } from "next/server";
import { toApiError } from "@/lib/errors";

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Single resource GET / POST response */
export function apiOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

/** Paginated list GET response */
export function apiList<T>(data: T[], meta: PageMeta): NextResponse {
  return NextResponse.json({ data, meta });
}

/** POST/PATCH success with no meaningful data to return */
export function apiSuccess(message = "Thành công"): NextResponse {
  return NextResponse.json({ success: true, message });
}

/** Standard error response */
export function apiError(
  message: string,
  code: string,
  status: number,
  headers?: Record<string, string>,
): NextResponse {
  return NextResponse.json({ error: message, code }, { status, headers });
}

/** Catch-block helper — converts any thrown error to a response */
export function apiCatch(err: unknown): NextResponse {
  const e = toApiError(err);
  return NextResponse.json({ error: e.error, code: e.code }, { status: e.statusCode });
}

/** Zod safeParse failure helper */
export function apiValidationError(issues: Array<{ message: string }>): NextResponse {
  return NextResponse.json(
    { error: issues[0]?.message ?? "Dữ liệu không hợp lệ", code: "VALIDATION_ERROR" },
    { status: 400 },
  );
}
