import { checkV3KeyRateLimit } from "@/lib/data/rateLimit"
import { V3_REQUESTS_PER_MINUTE } from "@/constants"
import type { Tier } from "@/constants/tier-limits"
import type { V3RateHeaders } from "./respond"

/**
 * The only limiter entry point in v3. Everything above it sees this signature
 * and nothing else, which is what makes the hypalimit swap a one-file change.
 *
 * Phase 1 (here): the existing Redis INCR path, with the Postgres fallback and
 * fail-closed behaviour it already has.
 * Phase 2: the hypalimit Elixir sidecar over a Unix socket. The numbers stay
 * identical; the shape tightens from a fixed window to a token bucket, which is
 * why v3.0 documents the number and promises nothing about bursts.
 */

export interface V3LimitResult {
  allowed: boolean
  headers: V3RateHeaders
  /** Seconds until the window resets. Sent as Retry-After on a 429. */
  retryAfter: number
}

export function limitForTier(tier: Tier): number {
  return V3_REQUESTS_PER_MINUTE[tier] ?? V3_REQUESTS_PER_MINUTE.free
}

export async function checkV3Limit(keyId: string, tier: Tier): Promise<V3LimitResult> {
  const limit = limitForTier(tier)
  const result = await checkV3KeyRateLimit(keyId, limit)
  const resetInSeconds = result.resetInSeconds > 0 ? result.resetInSeconds : 60

  return {
    allowed: result.allowed,
    headers: {
      limit,
      remaining: result.remaining,
      reset: Math.floor(Date.now() / 1000) + resetInSeconds,
    },
    retryAfter: resetInSeconds,
  }
}
