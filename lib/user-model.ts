import { getPool, ensureDatabase } from './db'
import crypto from 'node:crypto'
import { Tier, normalizeTier, isPaidTier } from './tier-limits'

/**
 * Zero-knowledge User model.
 *
 * DB columns:
 *   nickname_encrypted — AES-256-GCM encrypted nickname (client-side E2EE)
 *   password_hash      — PBKDF2 hash of access key (hpsk_...)
 *
 * No email, no IP, no OAuth ID, no PII stored.
 */

export interface User {
  id: string
  nickname_encrypted: string // encrypted client-side
  password_hash: string
  avatar_url: string | null
  premium: boolean
  tier: Tier
  last_acknowledged_tier: Tier
  inactivity_purge_days: number
  is_insider: number
  created_at: Date
  updated_at: Date
  last_login: Date | null
}

// --- TIER ---

export async function getUserTier(userId: string): Promise<Tier> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query<{ tier: string | null }>(
    `SELECT tier FROM users WHERE id = $1`,
    [userId]
  )
  return normalizeTier(result.rows[0]?.tier)
}

export async function getUserPremium(userId: string): Promise<boolean> {
  return isPaidTier(await getUserTier(userId))
}

export async function acknowledgeUserTier(userId: string): Promise<void> {
  await ensureDatabase()
  const pool = getPool()
  await pool.query(
    `UPDATE users SET last_acknowledged_tier = tier, updated_at = NOW() WHERE id = $1`,
    [userId]
  )
}

// --- NICKNAME ENCRYPTION LOGIC MOVED TO CLIENT-SIDE ---

// --- CREATE / LOOKUP ---

export interface CreateUserInput {
  id: string
  nickname_encrypted: string // E2E encrypted nickname
  password_hash: string      // PBKDF2 hash of the access key
}

export async function createUser(input: CreateUserInput): Promise<void> {
  await ensureDatabase()
  const pool = getPool()

  await pool.query(
    `INSERT INTO users (id, nickname_encrypted, password_hash, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())`,
    [input.id, input.nickname_encrypted, input.password_hash]
  )
}

/**
 * Nickname uniqueness is no longer checked or enforced,
 * as usernames are end-to-end encrypted.
 */
export async function nicknameExists(nickname: string): Promise<boolean> {
  return false
}

/**
 * Get user by ID — decrypts nickname for display.
 */
export async function getUserById(id: string): Promise<User | null> {
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
    premium: isPaidTier(normalizeTier(row.tier)),
    tier: normalizeTier(row.tier),
    last_acknowledged_tier: normalizeTier(row.last_acknowledged_tier),
    inactivity_purge_days: row.inactivity_purge_days ?? 7,
    is_insider: row.is_insider ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_login: row.last_login,
  }
}



/**
 * Get single user for auth verification (O(1) fast path).
 */
export async function getUserForAuthById(id: string): Promise<{ id: string; password_hash: string } | null> {
  await ensureDatabase()
  const pool = getPool()

  const result = await pool.query(
    `SELECT id, password_hash FROM users WHERE id = $1`,
    [id]
  )

  return result.rows.length > 0 ? result.rows[0] : null
}

// --- UPDATE ---

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
    `UPDATE users SET nickname_encrypted = $1, updated_at = NOW() WHERE id = $2`,
    [nickname_encrypted, userId]
  )
}

export async function updateAvatarUrl(userId: string, avatarUrl: string | null): Promise<void> {
  await ensureDatabase()
  const pool = getPool()

  await pool.query(
    `UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2`,
    [avatarUrl, userId]
  )
}

// --- SESSION ---

export async function createUserSession(userId: string): Promise<string> {
  await ensureDatabase()
  const pool = getPool()
  const id = crypto.randomUUID()

  await pool.query(
    `INSERT INTO user_sessions (id, user_id) VALUES ($1, $2)`,
    [id, userId]
  )

  return id
}

export async function revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
  await ensureDatabase()
  const pool = getPool()

  if (exceptSessionId) {
    await pool.query(
      `UPDATE user_sessions SET revoked = TRUE WHERE user_id = $1 AND id != $2`,
      [userId, exceptSessionId]
    )
  } else {
    await pool.query(
      `UPDATE user_sessions SET revoked = TRUE WHERE user_id = $1`,
      [userId]
    )
  }
}


