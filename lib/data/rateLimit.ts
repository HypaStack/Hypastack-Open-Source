import { getPool } from '@/lib/data/db'
import { getRedis } from '@/lib/data/redis'
import { WINDOW_MINUTES, MAX_ATTEMPTS } from '@/constants'

type TierKey = 'free' | 'essential' | 'premium' | 'ultimate'

function getTierAttempts(limits: Record<string, number>, tier: string): number {
  return limits[tier as TierKey] ?? limits['free']
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetInSeconds: number
}

async function checkRateLimit(
  accountId: string,
  action: string,
  windowMinutes: number,
  maxAttempts: number
): Promise<RateLimitResult> {
  const windowSeconds = windowMinutes * 60
  const redis = getRedis()

  if (redis) {
    try {
      const key = `hs:ratelimit:${action}:${accountId}`
      const lua = `
        local current = redis.call('INCR', KEYS[1])
        if current == 1 then
          redis.call('EXPIRE', KEYS[1], ARGV[1])
        end
        return current
      `
      const currentRaw = await redis.eval(lua, 1, key, windowSeconds)
      const current = Number(currentRaw)
      
      const ttl = await redis.ttl(key)
      const resetInSeconds = Math.max(0, ttl)

      if (current > maxAttempts) {
        console.error(`[RateLimit] ${action} blocked for account ${accountId.substring(0, 8)}. Count: ${current}, Reset in: ${resetInSeconds}s`)
        return { allowed: false, remaining: 0, resetInSeconds }
      }

      return {
        allowed: true,
        remaining: Math.max(0, maxAttempts - current),
        resetInSeconds
      }
    } catch (err) {
      console.warn('[RateLimit] Redis error, falling back to PostgreSQL:', (err as Error).message)
    }
  }

  const pool = getPool()

  try {
    await pool.query(
      `DELETE FROM rate_limits WHERE action = $1 AND first_attempt < NOW() - INTERVAL '1 minute' * $2::int`,
      [action, windowMinutes]
    )

    // Single atomic upsert that RETURNs the row's own post-increment count.
    // Reading via RETURNING (instead of a separate SELECT) means concurrent
    // requests each observe their committed counter value rather than racing
    // a follow-up read that could under-count.
    const result = await pool.query(
      `INSERT INTO rate_limits (account_id, action, attempt_count, first_attempt, last_attempt)
       VALUES ($1, $2, 1, NOW(), NOW())
       ON CONFLICT (account_id, action) DO UPDATE SET
         attempt_count = CASE
           WHEN EXTRACT(EPOCH FROM (NOW() - rate_limits.first_attempt)) >= $3::int
           THEN 1
           ELSE rate_limits.attempt_count + 1
         END,
         first_attempt = CASE
           WHEN EXTRACT(EPOCH FROM (NOW() - rate_limits.first_attempt)) >= $3::int
           THEN NOW()
           ELSE rate_limits.first_attempt
         END,
         last_attempt = NOW()
       RETURNING attempt_count, EXTRACT(EPOCH FROM (NOW() - first_attempt)) as seconds_elapsed`,
      [accountId, action, windowSeconds]
    )

    if (result.rows.length === 0) {
      return { allowed: true, remaining: maxAttempts - 1, resetInSeconds: windowSeconds }
    }

    const record = result.rows[0]
    const secondsElapsed = Number(record.seconds_elapsed)
    const resetInSeconds = Math.max(0, windowSeconds - secondsElapsed)

    if (record.attempt_count > maxAttempts) {
      console.error(`[RateLimit] ${action} blocked for account ${accountId.substring(0, 8)}. Count: ${record.attempt_count}, Reset in: ${resetInSeconds}s`)
      return { allowed: false, remaining: 0, resetInSeconds }
    }

    return {
      allowed: true,
      remaining: Math.max(0, maxAttempts - record.attempt_count),
      resetInSeconds
    }
  } catch (error) {
    // Fail closed: if Redis AND Postgres are both unreachable, deny rather than
    // let requests through unthrottled.
    console.error(`[RateLimit] Error checking ${action} rate limit:`, error)
    return { allowed: false, remaining: 0, resetInSeconds: windowSeconds }
  }
}

export async function checkUploadRateLimit(accountId: string, tier: string = 'free'): Promise<RateLimitResult> {
  return checkRateLimit(accountId, 'upload', WINDOW_MINUTES.upload, getTierAttempts(MAX_ATTEMPTS.upload, tier))
}

export async function checkCdnUploadRateLimit(accountId: string, tier: string = 'free'): Promise<RateLimitResult> {
  return checkRateLimit(accountId, 'cdn_upload', WINDOW_MINUTES.cdnUpload, getTierAttempts(MAX_ATTEMPTS.cdnUpload, tier))
}

export async function checkDownloadRateLimit(accountId: string, tier: string = 'free'): Promise<RateLimitResult> {
  return checkRateLimit(accountId, 'download', WINDOW_MINUTES.download, getTierAttempts(MAX_ATTEMPTS.download, tier))
}

export async function verifyDownloadRateLimit(accountId: string, tier: string = 'free'): Promise<RateLimitResult> {
  const maxAttempts = getTierAttempts(MAX_ATTEMPTS.download, tier)
  const windowSeconds = WINDOW_MINUTES.download * 60
  const redis = getRedis()

  if (redis) {
    try {
      const key = `hs:ratelimit:download:${accountId}`
      const currentRaw = await redis.get(key)
      const current = currentRaw ? parseInt(currentRaw, 10) : 0
      const ttl = await redis.ttl(key)
      const resetInSeconds = Math.max(0, ttl)

      if (current >= maxAttempts) {
        return { allowed: false, remaining: 0, resetInSeconds }
      }

      return { allowed: true, remaining: Math.max(0, maxAttempts - current), resetInSeconds }
    } catch (err) {
      console.warn('[RateLimit] Redis error in verifyDownloadRateLimit, falling back to PostgreSQL:', (err as Error).message)
    }
  }

  const pool = getPool()

  try {
    await pool.query(
      `DELETE FROM rate_limits WHERE action = 'download' AND first_attempt < NOW() - INTERVAL '1 minute'`
    )

    const result = await pool.query(
      `SELECT attempt_count, EXTRACT(EPOCH FROM (NOW() - first_attempt)) as seconds_elapsed
       FROM rate_limits
       WHERE account_id = $1 AND action = 'download'`,
      [accountId]
    )

    if (result.rows.length === 0) {
      return { allowed: true, remaining: maxAttempts, resetInSeconds: windowSeconds }
    }

    const record = result.rows[0]
    const secondsElapsed = Number(record.seconds_elapsed)
    const resetInSeconds = Math.max(0, windowSeconds - secondsElapsed)

    if (secondsElapsed >= windowSeconds) {
      return { allowed: true, remaining: maxAttempts, resetInSeconds: windowSeconds }
    }

    if (record.attempt_count >= maxAttempts) {
      return { allowed: false, remaining: 0, resetInSeconds }
    }

    return { allowed: true, remaining: maxAttempts - record.attempt_count, resetInSeconds }
  } catch (error) {
    console.error('[RateLimit] Error verifying download rate limit:', error)
    return { allowed: false, remaining: 0, resetInSeconds: windowSeconds }
  }
}

export async function checkLoginRateLimit(accountId: string): Promise<RateLimitResult> {
  return checkRateLimit(accountId, 'login', WINDOW_MINUTES.login, MAX_ATTEMPTS.login.free)
}

export async function checkRegisterRateLimit(accountId: string): Promise<RateLimitResult> {
  return checkRateLimit(accountId, 'register', WINDOW_MINUTES.register, MAX_ATTEMPTS.register.free)
}

export async function checkApiRateLimit(accountId: string): Promise<RateLimitResult> {
  return checkRateLimit(accountId, 'api', WINDOW_MINUTES.api, MAX_ATTEMPTS.api.free)
}

/** 5 reports per IP per 10 minutes — prevents forum_reports table flooding */
export async function checkForumReportRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(ip, 'forum_report', 10, 5)
}

/** Throttle the unauthenticated proxy-token endpoint per IP (client caches the
 *  token for ~50s, so a real user needs far fewer than this). */
export async function checkProxyTokenRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(ip, 'proxytoken', WINDOW_MINUTES.proxyToken, MAX_ATTEMPTS.proxyToken.free)
}

/** Throttle anonymous funnel drops per IP — the link is one-time, so this mainly
 *  caps repeated init attempts and abuse. */
export async function checkFunnelUploadRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(ip, 'funnel_upload', WINDOW_MINUTES.funnelUpload, MAX_ATTEMPTS.funnelUpload.free)
}

