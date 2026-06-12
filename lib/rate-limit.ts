import { getPool } from './db'
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
  const pool = getPool()
  const windowSeconds = windowMinutes * 60

  try {
    await pool.query(
      `DELETE FROM rate_limits WHERE action = $1 AND first_attempt < NOW() - INTERVAL '1 minute' * $2::int`,
      [action, windowMinutes]
    )

      await pool.query(
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
           last_attempt = NOW()`,
        [accountId, action, windowSeconds]
      )


    const result = await pool.query(
      `SELECT attempt_count, first_attempt, EXTRACT(EPOCH FROM (NOW() - first_attempt)) as seconds_elapsed
       FROM rate_limits
       WHERE account_id = $1 AND action = $2`,
      [accountId, action]
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
  const pool = getPool()
  const maxAttempts = getTierAttempts(MAX_ATTEMPTS.download, tier)
  const windowSeconds = WINDOW_MINUTES.download * 60

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

export async function checkPasswordChangeRateLimit(accountId: string): Promise<RateLimitResult> {
  return checkRateLimit(accountId, 'password_change', WINDOW_MINUTES.passwordChange, MAX_ATTEMPTS.passwordChange.free)
}

