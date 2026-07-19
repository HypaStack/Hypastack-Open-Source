import { NextRequest } from "next/server"
import { resolveApiKey, touchApiKey, KEY_PREFIX } from "@/lib/models/apiKeyModel"
import { getUserTier } from "@/lib/models/userModel"
import { getTierLimits } from "@/constants/tier-limits"
import type { Tier } from "@/constants/tier-limits"
import { V3_CODES } from "./codes"
import { newRequestId, v3Error, type V3RateHeaders } from "./respond"
import { checkV3Limit, checkV3GlobalLimit } from "./limit"
import { hasScope, type V3Scope } from "./scopes"

export interface V3Context<P> {
  request: NextRequest
  requestId: string
  keyId: string
  userId: string
  tier: Tier
  rate: V3RateHeaders
  params: P
}

type V3Handler<P> = (ctx: V3Context<P>) => Promise<Response> | Response

interface WithApiKeyOptions {
  /** The scope this route requires. Enforced here so a handler cannot forget. */
  scope: V3Scope
  /** Prefix for the 500 log line, e.g. "files GET". */
  label?: string
}

/** `Authorization: Bearer hsk_…` — the only accepted transport. Cookies are ignored. */
function readBearer(request: NextRequest): string | null {
  const header = request.headers.get("authorization")
  if (!header) return null
  const [scheme, token] = header.split(" ")
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null
  if (!token.startsWith(KEY_PREFIX)) return null
  return token
}

/**
 * The v3 request pipeline. Every route is wrapped in this, so auth, scope,
 * rate limiting, error shape and request ids are impossible to get individually
 * wrong.
 *
 *   missing header        → 401 missing_key
 *   unknown/revoked key   → 401 invalid_key
 *   tier has no API       → 403 plan_required
 *   key beyond allowance  → 403 key_limit_exceeded
 *   scope not granted     → 403 insufficient_scope
 *   budget spent          → 429 rate_limit_exceeded
 *   handler throws        → 500 internal_error (logged, never echoed)
 */
export function withApiKey<P = Record<string, never>>(
  handler: V3Handler<P>,
  options: WithApiKeyOptions,
) {
  return async function (
    request: NextRequest,
    context?: { params: Promise<P> },
  ): Promise<Response> {
    const requestId = newRequestId()

    try {
      // Load shedding comes before authentication on purpose: when the origin is
      // at its ceiling the cheapest possible rejection is the correct one, and
      // doing a key lookup first would spend the very resource we are protecting.
      const global = await checkV3GlobalLimit()
      if (!global.allowed) {
        return v3Error(
          global.unavailable ? V3_CODES.SERVICE_UNAVAILABLE : V3_CODES.SERVER_BUSY,
          requestId,
          { retryAfter: global.retryAfter },
        )
      }

      const presented = readBearer(request)
      if (!presented) {
        return v3Error(V3_CODES.MISSING_KEY, requestId)
      }

      const key = await resolveApiKey(presented)
      // Unknown and revoked collapse to the same answer — telling them apart
      // would confirm that a revoked key was once real.
      if (!key || key.revoked) {
        return v3Error(V3_CODES.INVALID_KEY, requestId)
      }

      const tier = await getUserTier(key.userId)
      const allowance = getTierLimits(tier).maxApiKeys

      // Free ranks to zero allowance, which is what enforces "no API on Free"
      // server-side rather than only in the UI.
      if (allowance === 0) {
        return v3Error(V3_CODES.PLAN_REQUIRED, requestId)
      }

      // After a downgrade, only the oldest N keys keep working. No cron, no
      // deletion — the rule is evaluated on use.
      if (key.rank >= allowance) {
        return v3Error(V3_CODES.KEY_LIMIT_EXCEEDED, requestId, {
          message: `Your plan allows ${allowance} key${allowance === 1 ? "" : "s"}. Revoke an older key or upgrade to use this one.`,
        })
      }

      if (!hasScope(key.scopes, options.scope)) {
        return v3Error(V3_CODES.INSUFFICIENT_SCOPE, requestId, {
          message: `This key does not have the ${options.scope} scope.`,
        })
      }

      const limit = await checkV3Limit(key.id, tier)
      if (!limit.allowed) {
        return v3Error(V3_CODES.RATE_LIMIT_EXCEEDED, requestId, {
          rate: limit.headers,
          retryAfter: limit.retryAfter,
        })
      }

      void touchApiKey(key.id)

      const params = (context ? await context.params : {}) as P
      const response = await handler({
        request,
        requestId,
        keyId: key.id,
        userId: key.userId,
        tier,
        rate: limit.headers,
        params,
      })

      return response
    } catch (error) {
      return v3Error(V3_CODES.INTERNAL_ERROR, requestId, {
        log: `${options.label ?? "route"}: ${(error as Error)?.stack ?? String(error)}`,
      })
    }
  }
}
