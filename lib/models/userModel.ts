import { getPool, ensureDatabase } from '@/lib/data/db'
import crypto from 'node:crypto'
import { Tier, normalizeTier, isPaidTier } from "@/constants/tier-limits"
import { DISPLAY_NAME_HOLD_DAYS } from "@/constants/profile"
import { cached, bustCache } from '@/lib/data/cache'


export interface User {
  id: string
  nickname_encrypted: string
  password_hash: string
  avatar_url: string | null
  banner_url: string | null
  display_name: string | null
  display_name_changed_at: Date | null
  nickname_changed_at: Date | null
  storage_token: string | null
  verified: boolean
  premium: boolean
  tier: Tier
  last_acknowledged_tier: Tier
  inactivity_purge_days: number

  created_at: Date
  updated_at: Date
  last_login: Date | null
}


export async function getUserTier(userId: string): Promise<Tier> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query<{ tier: string | null }>(
    `SELECT tier FROM users WHERE id = $1`,
    [userId]
  )
  return normalizeTier(result.rows[0]?.tier)
}

export async function acknowledgeUserTier(userId: string): Promise<void> {
  await ensureDatabase()
  const pool = getPool()
  await pool.query(
    `UPDATE users SET last_acknowledged_tier = tier, updated_at = NOW() WHERE id = $1`,
    [userId]
  )
  await bustCache(`user:${userId}:profile`)
}


export interface CreateUserInput {
  id: string
  nickname_encrypted: string
  password_hash: string
  key_lookup?: string
}

export async function createUser(input: CreateUserInput): Promise<void> {
  await ensureDatabase()
  const pool = getPool()

  const storageToken = crypto.randomBytes(16).toString('hex')
  await pool.query(
    `INSERT INTO users (id, nickname_encrypted, password_hash, key_lookup, storage_token, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
    [input.id, input.nickname_encrypted, input.password_hash, input.key_lookup ?? null, storageToken]
  )
}

// Returns the user's opaque storage namespace, generating + persisting one for
// legacy accounts that predate it (the migration backfills, so this is a rare
// defensive path).
export async function getStorageToken(userId: string): Promise<string> {
  await ensureDatabase()
  const pool = getPool()
  const res = await pool.query<{ storage_token: string | null }>(
    `SELECT storage_token FROM users WHERE id = $1`,
    [userId]
  )
  const existing = res.rows[0]?.storage_token
  if (existing) return existing
  const token = crypto.randomBytes(16).toString('hex')
  await pool.query(`UPDATE users SET storage_token = $1 WHERE id = $2 AND storage_token IS NULL`, [token, userId])
  await bustCache(`user:${userId}:profile`)
  // Re-read in case a concurrent request set it first.
  const after = await pool.query<{ storage_token: string | null }>(`SELECT storage_token FROM users WHERE id = $1`, [userId])
  return after.rows[0]?.storage_token ?? token
}

// Resolve an account by the deterministic identifier lookup (cid_ keys, which
// don't embed the user id). Returns password_hash so the caller can still
// authenticate with PBKDF2.
export async function getUserForAuthByKeyLookup(keyLookup: string): Promise<{ id: string; password_hash: string } | null> {
  await ensureDatabase()
  const pool = getPool()

  const result = await pool.query(
    `SELECT id, password_hash FROM users WHERE key_lookup = $1`,
    [keyLookup]
  )

  return result.rows.length > 0 ? result.rows[0] : null
}

// Backfill the lookup for a legacy (hpsk_) account after a successful login,
// so future logins can also resolve it via the indexed path.
export async function setUserKeyLookup(userId: string, keyLookup: string): Promise<void> {
  await ensureDatabase()
  const pool = getPool()

  await pool.query(
    `UPDATE users SET key_lookup = $1 WHERE id = $2 AND key_lookup IS NULL`,
    [keyLookup, userId]
  )
}

export async function getUserById(id: string): Promise<User | null> {
  return cached(`user:${id}:profile`, 300, async () => {
    await ensureDatabase()
    const pool = getPool()

    const result = await pool.query(
      `SELECT * FROM users WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) return null
    const row = result.rows[0]

    return {
      id: row.id,
      nickname_encrypted: row.nickname_encrypted,
      password_hash: row.password_hash,
      avatar_url: row.avatar_url,
      banner_url: row.banner_url ?? null,
      display_name: row.display_name ?? null,
      display_name_changed_at: row.display_name_changed_at ?? null,
      nickname_changed_at: row.nickname_changed_at ?? null,
      storage_token: row.storage_token ?? null,
      verified: row.verified ?? false,
      premium: isPaidTier(normalizeTier(row.tier)),
      tier: normalizeTier(row.tier),
      last_acknowledged_tier: normalizeTier(row.last_acknowledged_tier),
      inactivity_purge_days: row.inactivity_purge_days ?? 7,

      created_at: row.created_at,
      updated_at: row.updated_at,
      last_login: row.last_login,
    }
  })
}



export async function getUserForAuthById(id: string): Promise<{ id: string; password_hash: string } | null> {
  await ensureDatabase()
  const pool = getPool()

  const result = await pool.query(
    `SELECT id, password_hash FROM users WHERE id = $1`,
    [id]
  )

  return result.rows.length > 0 ? result.rows[0] : null
}


export async function updateLastLogin(userId: string): Promise<void> {
  await ensureDatabase()
  const pool = getPool()

  await pool.query(
    `UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1`,
    [userId]
  )
}

export async function updateNickname(userId: string, nickname_encrypted: string): Promise<void> {
  await ensureDatabase()
  const pool = getPool()

  await pool.query(
    `UPDATE users SET nickname_encrypted = $1, nickname_changed_at = NOW(), updated_at = NOW() WHERE id = $2`,
    [nickname_encrypted, userId]
  )
  await bustCache(`user:${userId}:profile`)
}

export async function updateAvatarUrl(userId: string, avatarUrl: string | null): Promise<void> {
  await ensureDatabase()
  const pool = getPool()

  await pool.query(
    `UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2`,
    [avatarUrl, userId]
  )
  await bustCache(`user:${userId}:profile`)
}

export async function updateBannerUrl(userId: string, bannerUrl: string | null): Promise<void> {
  await ensureDatabase()
  const pool = getPool()

  await pool.query(
    `UPDATE users SET banner_url = $1, updated_at = NOW() WHERE id = $2`,
    [bannerUrl, userId]
  )
  await bustCache(`user:${userId}:profile`)
}

export async function updateDisplayName(userId: string, displayName: string | null): Promise<void> {
  await ensureDatabase()
  const pool = getPool()

  await pool.query(
    `UPDATE users SET display_name = $1, display_name_changed_at = NOW(), updated_at = NOW() WHERE id = $2`,
    [displayName, userId]
  )
  await bustCache(`user:${userId}:profile`)
}

// True if another account already holds this display name (case-insensitive).
export async function isDisplayNameTaken(nameLower: string, exceptUserId: string): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()
  const res = await pool.query(
    `SELECT 1 FROM users WHERE lower(display_name) = $1 AND id <> $2 LIMIT 1`,
    [nameLower, exceptUserId]
  )
  return res.rows.length > 0
}

// True if this display name is currently held (locked for everyone) after a
// recent release. Expired holds are ignored (hypasched deletes them).
export async function isDisplayNameHeld(nameLower: string): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()
  const res = await pool.query(
    `SELECT 1 FROM display_name_holds WHERE name_lower = $1 AND expires_at > NOW() LIMIT 1`,
    [nameLower]
  )
  return res.rows.length > 0
}

// Reserve a released display name for the hold window. Locked for everyone,
// including the previous owner, until it expires.
export async function holdDisplayName(nameLower: string, releasedBy: string): Promise<void> {
  await ensureDatabase()
  const pool = getPool()
  const expiresAt = new Date(Date.now() + DISPLAY_NAME_HOLD_DAYS * 24 * 60 * 60 * 1000)
  await pool.query(
    `INSERT INTO display_name_holds (name_lower, released_by, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (name_lower) DO UPDATE SET released_by = EXCLUDED.released_by, expires_at = EXCLUDED.expires_at`,
    [nameLower, releasedBy, expiresAt]
  )
}


export async function createUserSession(userId: string, refreshTokenHash: string): Promise<string> {
  await ensureDatabase()
  const pool = getPool()
  const id = crypto.randomUUID()

  await pool.query(
    `INSERT INTO user_sessions (id, user_id, refresh_token_hash) VALUES ($1, $2, $3)`,
    [id, userId, refreshTokenHash]
  )

  return id
}

/**
 * Atomically validate + rotate a refresh token in a single CAS query.
 * Returns the session on success, null if the token was already used/revoked
 * (prevents race conditions where two concurrent requests read the same token).
 */
export async function atomicRotateRefreshToken(
  oldRefreshTokenHash: string,
  newRefreshTokenHash: string
): Promise<{ id: string; user_id: string } | null> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query<{ id: string; user_id: string }>(
    `UPDATE user_sessions
     SET refresh_token_hash = $1, updated_at = NOW()
     WHERE refresh_token_hash = $2 AND revoked = FALSE
     RETURNING id, user_id`,
    [newRefreshTokenHash, oldRefreshTokenHash]
  )
  return result.rows[0] ?? null
}

export async function revokeSession(sessionId: string): Promise<void> {
  await ensureDatabase()
  const pool = getPool()
  await pool.query(
    `UPDATE user_sessions SET revoked = TRUE WHERE id = $1`,
    [sessionId]
  )
}


