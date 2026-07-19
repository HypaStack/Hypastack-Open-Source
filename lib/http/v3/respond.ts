import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { V3_CODES, V3_MESSAGE, V3_STATUS, type V3Code } from "./codes"

/** Budget snapshot echoed on every response so clients never have to guess. */
export interface V3RateHeaders {
  limit: number
  remaining: number
  /** Unix seconds at which the window resets. */
  reset: number
}

export interface V3ErrorOptions {
  /** Overrides the code's default message. Ignored for `not_found` — see below. */
  message?: string
  /** Names the offending field on `invalid_request`. */
  param?: string
  /** Seconds until retry, for 429/503. */
  retryAfter?: number
  rate?: V3RateHeaders
  /** Detail for the server log only. Never reaches the client. */
  log?: string
}

/** Short, unique enough to find one line in a log. */
export function newRequestId(): string {
  return `req_${randomBytes(8).toString("base64url")}`
}

function withCommonHeaders(res: NextResponse, requestId: string, rate?: V3RateHeaders): NextResponse {
  res.headers.set("X-Request-Id", requestId)
  if (rate) {
    res.headers.set("X-RateLimit-Limit", String(rate.limit))
    res.headers.set("X-RateLimit-Remaining", String(rate.remaining))
    res.headers.set("X-RateLimit-Reset", String(rate.reset))
  }
  return res
}

/** Success. `body` is the resource itself — v3 does not wrap successes. */
export function v3Ok(
  body: unknown,
  requestId: string,
  rate?: V3RateHeaders,
  status = 200,
): NextResponse {
  return withCommonHeaders(NextResponse.json(body, { status }), requestId, rate)
}

/**
 * The only way a v3 route produces an error, so the shape cannot drift.
 *
 * Two rules enforced here rather than trusted to callers:
 *
 *  - `not_found` always carries the catalogue message verbatim. A caller cannot
 *    accidentally leak "you don't own this" by passing a specific message; the
 *    ambiguity between "gone" and "not yours" is what stops key holders
 *    enumerating other accounts' resources.
 *  - 5xx never carries caller-facing detail. The `log` string is written to the
 *    server log against the request id and nothing else escapes.
 */
export function v3Error(
  code: V3Code,
  requestId: string,
  options: V3ErrorOptions = {},
): NextResponse {
  const status = V3_STATUS[code]
  const isNotFound = code === V3_CODES.NOT_FOUND
  const message = isNotFound || status >= 500
    ? V3_MESSAGE[code]
    : options.message ?? V3_MESSAGE[code]

  if (options.log || status >= 500) {
    console.error(`[v3] ${requestId} ${status} ${code}: ${options.log ?? message}`)
  }

  const res = NextResponse.json(
    {
      error: {
        code,
        message,
        status,
        request_id: requestId,
        ...(options.param ? { param: options.param } : {}),
      },
    },
    { status },
  )

  if (options.retryAfter !== undefined) {
    res.headers.set("Retry-After", String(options.retryAfter))
  }

  return withCommonHeaders(res, requestId, options.rate)
}
