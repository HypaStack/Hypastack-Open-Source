import { NextResponse } from "next/server"

/**
 * Standard JSON error response for API routes.
 *
 * Replaces the repeated `console.error("[API Error] …")` + `NextResponse.json`
 * pair so the logged line and the returned body can't drift apart.
 *
 * @param status  HTTP status code (also used in the log line).
 * @param error   The error value returned to the client (use an API_ERRORS constant).
 * @param logMessage  Optional human-readable detail for the server log. Falls back to `error`.
 * @param extra  Optional extra fields merged into the JSON body (e.g. `retryAfter`, `message`).
 */
export function apiError(
  status: number,
  error: string,
  logMessage?: string,
  extra?: Record<string, unknown>,
): NextResponse {
  console.error(`[API Error] ${status}: ${logMessage ?? error}`)
  return NextResponse.json({ error, ...extra }, { status })
}
