import { NextResponse } from "next/server"

// Standard JSON error response: keeps the logged line and returned body from drifting apart.
// Body has `error` (friendly copy, see constants/errors.ts) and `message` (route-specific detail).
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
