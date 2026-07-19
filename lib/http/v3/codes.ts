/**
 * The v3 error catalogue. Closed set — every failure the public API can return
 * is one of these codes, and the code is what clients switch on.
 *
 * `message` is for humans and may be reworded at any time; it is never parsed.
 * New codes are additive-only within v3, and the docs tell clients to fall back
 * to the HTTP status on an unrecognised code, so adding one is never breaking.
 *
 * Deliberately separate from constants/errors.ts (v2), where `error` is friendly
 * copy for a UI toast. These two fields do different jobs and must not be shared.
 */
export const V3_CODES = {
  INVALID_REQUEST: "invalid_request",
  MISSING_KEY: "missing_key",
  INVALID_KEY: "invalid_key",
  INSUFFICIENT_SCOPE: "insufficient_scope",
  PLAN_REQUIRED: "plan_required",
  KEY_LIMIT_EXCEEDED: "key_limit_exceeded",
  QUOTA_EXCEEDED: "quota_exceeded",
  NOT_FOUND: "not_found",
  FILE_TOO_LARGE: "file_too_large",
  RATE_LIMIT_EXCEEDED: "rate_limit_exceeded",
  INTERNAL_ERROR: "internal_error",
  SERVER_BUSY: "server_busy",
  SERVICE_UNAVAILABLE: "service_unavailable",
} as const

export type V3Code = (typeof V3_CODES)[keyof typeof V3_CODES]

/** The HTTP status each code is returned with. */
export const V3_STATUS: Record<V3Code, number> = {
  invalid_request: 400,
  missing_key: 401,
  invalid_key: 401,
  insufficient_scope: 403,
  plan_required: 403,
  key_limit_exceeded: 403,
  quota_exceeded: 403,
  not_found: 404,
  file_too_large: 413,
  rate_limit_exceeded: 429,
  internal_error: 500,
  server_busy: 503,
  service_unavailable: 503,
}

/**
 * Default human message per code. Handlers may pass a more specific one, except
 * for `not_found`, which is always this exact string — the ambiguity between
 * "never existed" and "not yours" is the security property.
 */
export const V3_MESSAGE: Record<V3Code, string> = {
  invalid_request: "The request was not valid.",
  missing_key: "No API key was provided. Send it as: Authorization: Bearer hsk_…",
  invalid_key: "That API key is not valid.",
  insufficient_scope: "This key does not have the required scope.",
  plan_required: "The API is available on paid plans only.",
  key_limit_exceeded: "This key is beyond the number allowed on your plan.",
  quota_exceeded: "That would go over your plan's limit.",
  not_found: "That resource does not exist or is not accessible with this key.",
  file_too_large: "That file is larger than your plan allows.",
  rate_limit_exceeded: "Too many requests. Slow down and retry after the window resets.",
  internal_error: "Something went wrong on our end.",
  // Distinct from service_unavailable on purpose: this one means the request was
  // shed to protect the origin, so a retry after the window is expected to work.
  server_busy: "Hypastack's servers are under heavy load, try again later.",
  service_unavailable: "The service is temporarily unavailable. Retry shortly.",
}
