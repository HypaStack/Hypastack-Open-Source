import { NextRequest } from "next/server"
import { apiError } from "@/lib/api-error"
import { getCurrentUser } from "@/lib/auth"
import { checkApiRateLimit } from "@/lib/rate-limit"
import { API_ERRORS } from "@/constants"

type AuthedUser = { userId: string; sessionId: string }

interface AuthedContext<P> {
  request: NextRequest
  user: AuthedUser
  params: P
}

interface WithAuthOptions {
  /** Apply the per-user API rate limit before running the handler. */
  rateLimit?: boolean
  /** Prefix for the 500 error log, e.g. "Files GET". Falls back to "Route". */
  label?: string
}

type AuthedHandler<P> = (ctx: AuthedContext<P>) => Promise<Response> | Response

/**
 * Wraps an authenticated API route handler with the auth/rate-limit/error
 * plumbing that was previously copy-pasted into every handler:
 *
 *   - 401 if there's no current user
 *   - 429 if `rateLimit` is set and the API rate limit is exceeded
 *   - 500 (logged with `label`) if the handler throws
 *
 * The handler receives `{ request, user, params }` and only contains the
 * route's real logic. Dynamic params are awaited and passed through.
 */
export function withAuth<P = Record<string, never>>(
  handler: AuthedHandler<P>,
  options: WithAuthOptions = {},
) {
  return async function (
    request: NextRequest,
    context?: { params: Promise<P> },
  ): Promise<Response> {
    try {
      const user = await getCurrentUser(request)
      if (!user) {
        return apiError(401, API_ERRORS.UNAUTHORIZED, "401 Not Authenticated")
      }

      if (options.rateLimit) {
        const rl = await checkApiRateLimit(user.userId)
        if (!rl.allowed) {
          return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "429 Too Many Requests")
        }
      }

      const params = (context ? await context.params : {}) as P
      return await handler({ request, user, params })
    } catch (error) {
      console.error(`[${options.label ?? "Route"}] error:`, error)
      return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "500 Internal Server Error")
    }
  }
}
