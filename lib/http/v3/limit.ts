import { checkV3KeyRateLimit } from "@/lib/data/rateLimit"
import { getRedis } from "@/lib/data/redis"
import { V3_REQUESTS_PER_MINUTE, V3_GLOBAL_REQUESTS_PER_MINUTE } from "@/constants"
import type { Tier } from "@/constants/tier-limits"
import type { V3RateHeaders } from "./respond"

// The only v3 limiter entry point — swapping in the hypalimit sidecar later is a one-file change.

export interface V3LimitResult {
  allowed: boolean
  headers: V3RateHeaders
  /** Seconds until the window resets. Sent as Retry-After on a 429. */
  retryAfter: number
}

export function limitForTier(tier: Tier): number {
  return V3_REQUESTS_PER_MINUTE[tier] ?? V3_REQUESTS_PER_MINUTE.free
}

export interface V3GlobalResult {
  allowed: boolean
  /** Seconds until the current minute window rolls over. */
  retryAfter: number
  /** True when the ceiling could not be evaluated at all. */
  unavailable?: boolean
}

/** Fixed one-minute buckets, so the key itself carries the window. */
function globalWindowKey(now: number): { key: string; secondsLeft: number } {
  const minute = Math.floor(now / 60_000)
  return { key: `hs:v3:global:${minute}`, secondsLeft: 60 - Math.floor((now % 60_000) / 1000) }
}

// Hard ceiling across all v3 traffic, checked before any DB work. Redis-only —
// unlike the per-account limiter, this is one counter for every request, so a
// Postgres fallback would just move the outage instead of preventing it.
export async function checkV3GlobalLimit(): Promise<V3GlobalResult> {
  const redis = getRedis()
  const { key, secondsLeft } = globalWindowKey(Date.now())

  if (!redis) {
    return unreachable(secondsLeft)
  }

  try {
    const lua = `
      local current = redis.call('INCR', KEYS[1])
      if current == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
      end
      return current
    `
    // 120s rather than 60s so a bucket outlives its window and a clock skew
    // between app instances can't resurrect a counter that was already spent.
    const current = Number(await redis.eval(lua, 1, key, 120))

    if (current > V3_GLOBAL_REQUESTS_PER_MINUTE) {
      console.error(`[v3] global ceiling hit: ${current}/${V3_GLOBAL_REQUESTS_PER_MINUTE} this minute`)
      return { allowed: false, retryAfter: secondsLeft }
    }

    return { allowed: true, retryAfter: 0 }
  } catch (err) {
    console.error("[v3] global limiter error:", (err as Error).message)
    return unreachable(secondsLeft)
  }
}

// Prod fails closed (no counter = no bound on a flood); dev fails open since dev has no Redis.
export function unreachable(
  secondsLeft: number,
  isProduction = process.env.NODE_ENV === "production",
): V3GlobalResult {
  if (!isProduction) {
    console.warn("[v3] global ceiling skipped — no Redis in this environment (dev only)")
    return { allowed: true, retryAfter: 0 }
  }
  return { allowed: false, retryAfter: secondsLeft, unavailable: true }
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
