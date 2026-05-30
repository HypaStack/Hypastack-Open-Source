import { getPool } from './db'

/**
 * Account-based rate limiting.
 *
 * All rate limits are keyed by the user's account ID (UUID), never by IP.
 * This ensures zero IP logging while still providing effective abuse prevention.
 *
 * The `rate_limits` table uses `account_id` as the primary key alongside `action`.
 */

const UPLOAD_WINDOW_MS = 10 * 60 * 1000
const UPLOAD_MAX_ATTEMPTS = 5

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
    // Cleanup expired entries for this action
    await pool.query(
      `DELETE FROM rate_limits WHERE action = $1 AND first_attempt < NOW() - INTERVAL '1 minute' * $2::int`,
      [action, windowMinutes]
    )

    // Upsert: use account_id + action
    // Note: the DB unique constraint may be on account_id alone or (account_id, action).
    // We handle both by catching conflicts gracefully.
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
    return { allowed: true, remaining: maxAttempts, resetInSeconds: 0 }
  }
}

// NOTE: All functions now accept accountId (userId) instead of IP

export async function checkUploadRateLimit(accountId: string, tier: string = 'free'): Promise<RateLimitResult> {
  let maxAttempts = 30
  if (tier === 'essential') maxAttempts = 200
  if (tier === 'premium') maxAttempts = 500
  if (tier === 'ultimate') maxAttempts = 1500
  return checkRateLimit(accountId, 'upload', 1, maxAttempts)
}

export async function checkCdnUploadRateLimit(accountId: string, tier: string = 'free'): Promise<RateLimitResult> {
  let maxAttempts = 10
  if (tier === 'essential') maxAttempts = 100
  if (tier === 'premium') maxAttempts = 300
  if (tier === 'ultimate') maxAttempts = 1000
  return checkRateLimit(accountId, 'cdn_upload', 1, maxAttempts)
}

export async function checkDownloadRateLimit(accountId: string, tier: string = 'free'): Promise<RateLimitResult> {
  let maxAttempts = 5
  if (tier === 'essential') maxAttempts = 50
  if (tier === 'premium') maxAttempts = 150
  if (tier === 'ultimate') maxAttempts = 500
  return checkRateLimit(accountId, 'download', 1, maxAttempts)
}

export async function verifyDownloadRateLimit(accountId: string, tier: string = 'free'): Promise<RateLimitResult> {
  const pool = getPool()
  let maxAttempts = 5
  if (tier === 'essential') maxAttempts = 50
  if (tier === 'premium') maxAttempts = 150
  if (tier === 'ultimate') maxAttempts = 500

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
      return { allowed: true, remaining: maxAttempts, resetInSeconds: 60 }
    }

    const record = result.rows[0]
    const secondsElapsed = Number(record.seconds_elapsed)
    const resetInSeconds = Math.max(0, 60 - secondsElapsed)

    if (secondsElapsed >= 60) {
      return { allowed: true, remaining: maxAttempts, resetInSeconds: 60 }
    }

    if (record.attempt_count >= maxAttempts) {
      return { allowed: false, remaining: 0, resetInSeconds }
    }

    return { allowed: true, remaining: maxAttempts - record.attempt_count, resetInSeconds }
  } catch (error) {
    console.error('[RateLimit] Error verifying download rate limit:', error)
    return { allowed: true, remaining: 5, resetInSeconds: 0 }
  }
}

export async function checkLoginRateLimit(accountId: string): Promise<RateLimitResult> {
  return checkRateLimit(accountId, 'login', 5, 5)
}

export async function checkRegisterRateLimit(accountId: string): Promise<RateLimitResult> {
  return checkRateLimit(accountId, 'register', 5, 5)
}

export async function checkApiRateLimit(accountId: string): Promise<RateLimitResult> {
  return checkRateLimit(accountId, 'api', 1, 120)
}

export async function checkPasswordChangeRateLimit(accountId: string): Promise<RateLimitResult> {
  return checkRateLimit(accountId, 'password_change', 5, 3)
}

