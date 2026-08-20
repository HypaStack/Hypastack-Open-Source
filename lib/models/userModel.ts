import { getPool, getClient, ensureDatabase } from '@/lib/data/db'
import crypto from 'node:crypto'
import { Tier, normalizeTier, isPaidTier } from "@/constants/tier-limits"
import { DISPLAY_NAME_HOLD_DAYS } from "@/constants/profile"
import { cached, bustCache } from '@/lib/data/cache'
import { deleteObjectsBatch } from '@/lib/storage/r2'


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
  is_owner: boolean
  suspended: boolean

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
  inviteCode: string
  key_lookup?: string
}

// Claiming the invite code and inserting the account happen in one
// transaction, so a code can never end up marked used without a matching
// account, and two signups racing the same code can't both win. Returns
// false (no account created) when the code doesn't exist or is already used.
export async function createUser(input: CreateUserInput): Promise<boolean> {
  await ensureDatabase()
  const client = await getClient()
  const storageToken = crypto.randomBytes(16).toString('hex')

  try {
    await client.query('BEGIN')

    // uses_count < max_uses re-evaluates against the locked row, so N
    // concurrent signups on the same multi-use code can't all squeeze past
    // its limit.
    const claim = await client.query(
      `UPDATE invite_codes SET uses_count = uses_count + 1 WHERE code = $1 AND uses_count < max_uses`,
      [input.inviteCode]
    )
    if (claim.rowCount === 0) {
      await client.query('ROLLBACK')
      return false
    }
    await client.query(
      `INSERT INTO invite_code_redemptions (code, user_id) VALUES ($1, $2)`,
      [input.inviteCode, input.id]
    )

    await client.query(
      `INSERT INTO users (id, nickname_encrypted, password_hash, key_lookup, storage_token, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [input.id, input.nickname_encrypted, input.password_hash, input.key_lookup ?? null, storageToken]
    )

    await client.query('COMMIT')
    return true
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
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
export async function getUserForAuthByKeyLookup(keyLookup: string): Promise<{ id: string; password_hash: string; suspended: boolean; is_owner: boolean } | null> {
  await ensureDatabase()
  const pool = getPool()

  const result = await pool.query(
    `SELECT id, password_hash, suspended, is_owner FROM users WHERE key_lookup = $1`,
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
      is_owner: row.is_owner ?? false,
      suspended: row.suspended ?? false,

      created_at: row.created_at,
      updated_at: row.updated_at,
      last_login: row.last_login,
    }
  })
}



export async function getUserForAuthById(id: string): Promise<{ id: string; password_hash: string; suspended: boolean; is_owner: boolean } | null> {
  await ensureDatabase()
  const pool = getPool()

  const result = await pool.query(
    `SELECT id, password_hash, suspended, is_owner FROM users WHERE id = $1`,
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

export interface SwitcherProfile {
  id: string
  nickname_encrypted: string
  display_name: string | null
  avatar_url: string | null
  suspended: boolean
}

// Just enough to draw a row in the account switcher. The nickname stays
// encrypted here, only the browser holding that account's master key can read it.
export async function getSwitcherProfiles(ids: string[]): Promise<SwitcherProfile[]> {
  if (ids.length === 0) return []
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(
    `SELECT id, nickname_encrypted, display_name, avatar_url, suspended
     FROM users WHERE id = ANY($1::text[])`,
    [ids]
  )
  return result.rows.map((row) => ({
    id: row.id,
    nickname_encrypted: row.nickname_encrypted,
    display_name: row.display_name ?? null,
    avatar_url: row.avatar_url ?? null,
    suspended: row.suspended ?? false,
  }))
}

// One round trip for the whole switcher instead of a query per stashed account,
// which also caps the work a forged accounts cookie can cause.
export async function getLiveSessionUserIds(
  pairs: { userId: string; refreshTokenHash: string }[]
): Promise<Set<string>> {
  if (pairs.length === 0) return new Set()
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM user_sessions
     WHERE revoked = FALSE
       AND (user_id, refresh_token_hash) IN (SELECT * FROM unnest($1::text[], $2::text[]))`,
    [pairs.map((p) => p.userId), pairs.map((p) => p.refreshTokenHash)]
  )
  return new Set(result.rows.map((r) => r.user_id))
}

// Account switching hands back a refresh token the browser stashed at login.
// Scoped to the user id so a token can only ever resume its own account.
export async function getLiveSessionByRefreshHash(
  userId: string,
  refreshTokenHash: string
): Promise<{ id: string } | null> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query<{ id: string }>(
    `SELECT id FROM user_sessions WHERE user_id = $1 AND refresh_token_hash = $2 AND revoked = FALSE`,
    [userId, refreshTokenHash]
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

// Revoke every active session for the user except the one they're on now.
// Returns how many were revoked (for UI feedback).
export async function revokeOtherUserSessions(userId: string, currentSessionId: string): Promise<number> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(
    `UPDATE user_sessions SET revoked = TRUE WHERE user_id = $1 AND id <> $2 AND revoked = FALSE`,
    [userId, currentSessionId]
  )
  return result.rowCount ?? 0
}

// ── Admin ────────────────────────────────────────────────────────────────
// Everything below is gated by withAuth's ownerOnly option, which re-checks
// is_owner fresh from the DB on every request. Nothing here is reachable by
// a normal account no matter what the client claims.

// Uncached on purpose: revoking is_owner has to take effect on the very next
// request, not up to getUserById's 5-minute cache window.
export async function isOwner(userId: string): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query<{ is_owner: boolean }>(`SELECT is_owner FROM users WHERE id = $1`, [userId])
  return result.rows[0]?.is_owner ?? false
}

export interface AdminUserRow {
  id: string
  display_name: string | null
  avatar_url: string | null
  tier: Tier
  suspended: boolean
  is_owner: boolean
  storage_used: number
  created_at: Date
  last_login: Date | null
}

// Search matches the account id or display name (nicknames are encrypted
// client-side, there is nothing else server-readable to search on).
export async function listUsersAdmin(opts: { search?: string; limit?: number; offset?: number }): Promise<AdminUserRow[]> {
  await ensureDatabase()
  const pool = getPool()
  const limit = Math.min(opts.limit ?? 50, 100)
  const offset = opts.offset ?? 0
  const search = opts.search?.trim() || null

  const result = await pool.query(
    // The page of users is picked first, then storage is summed per row. Summing
    // both tables up front meant a full scan of every file on every page view.
    `WITH page AS (
       SELECT u.id, u.display_name, u.avatar_url, u.tier, u.suspended, u.is_owner, u.created_at, u.last_login
       FROM users u
       WHERE $1::text IS NULL OR u.id ILIKE $1 || '%' OR u.display_name ILIKE '%' || $1 || '%'
       ORDER BY u.created_at DESC
       LIMIT $2 OFFSET $3
     )
     SELECT page.*, COALESCE(f.storage, 0) + COALESCE(c.storage, 0) AS storage_used
     FROM page
     LEFT JOIN LATERAL (SELECT SUM(file_size) AS storage FROM basedrop_files WHERE user_id = page.id) f ON TRUE
     LEFT JOIN LATERAL (SELECT SUM(file_size) AS storage FROM cdn_assets WHERE user_id = page.id) c ON TRUE
     ORDER BY page.created_at DESC`,
    [search, limit, offset]
  )

  return result.rows.map((row) => ({
    id: row.id,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    tier: normalizeTier(row.tier),
    suspended: row.suspended,
    is_owner: row.is_owner,
    storage_used: Number(row.storage_used),
    created_at: row.created_at,
    last_login: row.last_login,
  }))
}

export async function setUserTierAdmin(userId: string, tier: Tier): Promise<void> {
  await ensureDatabase()
  const pool = getPool()
  await pool.query(`UPDATE users SET tier = $1, updated_at = NOW() WHERE id = $2`, [tier, userId])
  await bustCache(`user:${userId}:profile`)
}

// Suspension is checked at login, not just hidden in the UI, an already-active
// session still gets revoked below so it can't keep making requests.
export async function setUserSuspended(userId: string, suspended: boolean): Promise<void> {
  await ensureDatabase()
  const pool = getPool()
  await pool.query(
    `UPDATE users SET suspended = $1, suspended_at = CASE WHEN $1 THEN NOW() ELSE NULL END, updated_at = NOW() WHERE id = $2`,
    [suspended, userId]
  )
  if (suspended) {
    await pool.query(`UPDATE user_sessions SET revoked = TRUE WHERE user_id = $1`, [userId])
  }
  await bustCache(`user:${userId}:profile`)
}

// Deletes the account and everything it owns: files, CDN assets, funnels,
// sessions and API keys, both stored (R2) and in-flight (staging). Forum
// posts/comments are left in place on purpose, deleting an account shouldn't
// silently erase a public discussion other people replied to. The invite
// code this account used is left alone too, so it stays a record of who
// claimed it even after the account is gone.
export async function deleteUserAccountAdmin(userId: string): Promise<boolean> {
  await ensureDatabase()
  const client = await getClient()

  try {
    await client.query('BEGIN')

    const exists = await client.query(`SELECT 1 FROM users WHERE id = $1`, [userId])
    if (exists.rows.length === 0) {
      await client.query('ROLLBACK')
      return false
    }

    const r2Keys: string[] = []
    const collect = async (sql: string) => {
      const res = await client.query<{ r2_key: string }>(sql, [userId])
      for (const row of res.rows) r2Keys.push(row.r2_key)
    }

    await collect(`SELECT r2_key FROM basedrop_files WHERE user_id = $1`)
    await collect(`SELECT r2_key FROM upload_staging WHERE user_id = $1`)
    await collect(`SELECT r2_key FROM cdn_assets WHERE user_id = $1`)
    await collect(`SELECT r2_key FROM cdn_staging WHERE user_id = $1`)
    await collect(`SELECT r2_key FROM funnel_files WHERE user_id = $1`)
    await collect(`SELECT fs.r2_key FROM funnel_staging fs JOIN funnels fn ON fn.id = fs.funnel_id WHERE fn.user_id = $1`)

    await client.query(`DELETE FROM basedrop_files WHERE user_id = $1`, [userId])
    await client.query(`DELETE FROM basedrop_folders WHERE user_id = $1`, [userId])
    await client.query(`DELETE FROM upload_staging WHERE user_id = $1`, [userId])
    await client.query(`DELETE FROM cdn_assets WHERE user_id = $1`, [userId])
    await client.query(`DELETE FROM cdn_folders WHERE user_id = $1`, [userId])
    await client.query(`DELETE FROM cdn_staging WHERE user_id = $1`, [userId])
    await client.query(`DELETE FROM funnel_files WHERE user_id = $1`, [userId])
    await client.query(`DELETE FROM funnel_staging WHERE funnel_id IN (SELECT id FROM funnels WHERE user_id = $1)`, [userId])
    await client.query(`DELETE FROM funnels WHERE user_id = $1`, [userId])
    await client.query(`DELETE FROM api_keys WHERE user_id = $1`, [userId])
    await client.query(`DELETE FROM user_sessions WHERE user_id = $1`, [userId])
    await client.query(`DELETE FROM users WHERE id = $1`, [userId])

    await client.query('COMMIT')

    if (r2Keys.length > 0) {
      // Best-effort: the account is already gone either way, a stray R2
      // object left behind is a cleanup job, not a reason to fail this.
      await deleteObjectsBatch(r2Keys).catch((err) => {
        console.error(`[Admin] Failed to delete R2 objects for account ${userId}:`, err)
      })
    }

    return true
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}


