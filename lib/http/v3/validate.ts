import { z } from "zod"

/** A Zod failure reduced to the one thing the error body needs. */
export interface ValidationFailure {
  param: string
  message: string
}

/**
 * Translate a Zod error into `invalid_request` material. Only the first issue is
 * surfaced: reporting every failure at once invites clients to parse the list,
 * and one clearly-named field is enough to fix the call.
 */
export function firstFailure(error: z.ZodError): ValidationFailure {
  const issue = error.issues[0]
  const param = issue.path.length > 0 ? issue.path.join(".") : "body"
  return { param, message: issue.message }
}

/**
 * Parse a request body against a schema. Returns either the typed value or the
 * failure material — never throws, so handlers stay branch-only.
 */
export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown,
): { ok: true; value: z.infer<T> } | { ok: false; failure: ValidationFailure } {
  const result = schema.safeParse(body)
  if (result.success) return { ok: true, value: result.data }
  return { ok: false, failure: firstFailure(result.error) }
}

/**
 * Read a JSON body without letting a malformed one reach the handler as a throw.
 * An absent body parses as `{}` so schemas decide what is required, rather than
 * every handler special-casing "no body sent".
 */
export async function readJson(request: Request): Promise<{ ok: true; value: unknown } | { ok: false }> {
  try {
    const text = await request.text()
    if (!text.trim()) return { ok: true, value: {} }
    return { ok: true, value: JSON.parse(text) }
  } catch {
    return { ok: false }
  }
}
