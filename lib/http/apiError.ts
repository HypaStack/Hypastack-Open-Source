import { NextResponse } from "next/server"

/**
 * Standard JSON error response for API routes.
 *
 * Replaces the repeated `console.error("[API Error] …")` + `NextResponse.json`
 * pair so the logged line and the returned body can't drift apart.
 *
 * The body carries two fields: `error` (friendly, code-free copy — see
 * constants/errors.ts) and `message` (the route's specific human detail, if
 * any). Clients should show `message` and fall back to `error`; neither ever
 * exposes a raw status code or internal server detail to the user.
 *
 * @param status  HTTP status code (also used in the log line).
 * @param error   The friendly error value returned to the client (an API_ERRORS constant).
 * @param logMessage  Optional specific detail — logged in full, and surfaced to the user for 4xx.
 * @param extra  Optional extra fields merged into the JSON body (e.g. `retryAfter`, `suggestions`).
 */
export function apiError(
  status: number,
  error: string,
  logMessage?: string,
  extra?: Record<string, unknown>,
): NextResponse {
  console.error(`[API Error] ${status}: ${logMessage ?? error}`)
  return NextResponse.json({ error, message: toUserMessage(status, logMessage, error), ...extra }, { status })
}

// Turn a route's internal detail into user-safe copy: strip any leading "NNN "
// status-code prefix, never surface raw server-error text (5xx), and fall back
// to the friendly per-status `error` when there's no usable detail.
function toUserMessage(status: number, logMessage: string | undefined, error: string): string {
  if (status >= 500) return error
  const cleaned = (logMessage ?? "").replace(/^\d{3}\s+/, "").trim()
  return cleaned || error
}
