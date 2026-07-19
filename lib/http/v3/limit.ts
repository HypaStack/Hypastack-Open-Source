import { checkV3KeyRateLimit } from "@/lib/data/rateLimit"
import { getRedis } from "@/lib/data/redis"
import { V3_REQUESTS_PER_MINUTE, V3_GLOBAL_REQUESTS_PER_MINUTE } from "@/constants"
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

/**
 * The hard ceiling across all v3 traffic. Checked before anything else in the
 * request, so a request shed here costs one Redis INCR and no database work —
 * which is the entire point: v3 must never be able to take down the site it is
 * bolted to.
 *
 * Redis-only, deliberately. The per-account limiter falls back to a Postgres
 * upsert when Redis is down, which is fine for a counter split across many rows
 * — but this is ONE counter taking every v3 request, and 30k writes a minute
 * contending on a single row would cause exactly the outage this exists to
 * prevent. With no Redis there is no safe way to count, so it fails closed.
 *
 * The bucket key embeds the minute, so windows roll over without a separate
 * EXPIRE round-trip and an abandoned bucket simply ages out.
 */
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

/**
 * What to do when the ceiling can't be evaluated.
 *
 * Production fails closed: without a counter there is no bound on a flood, and
 * refusing v3 is strictly better than letting it take the website with it.
 *
 * Development fails open, because dev machines don't run Redis and a v3 that
 * answers every request with 503 locally is untestable. Same reasoning the
 * upload routes use to skip Turnstile outside production — and it is scoped to
 * NODE_ENV rather than a config flag so it can't be switched on in prod by
 * accident.
 */
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
