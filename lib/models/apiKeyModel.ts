import { randomBytes } from "crypto"
import { getPool, ensureDatabase } from "@/lib/data/db"
import { cached, bustCache } from "@/lib/data/cache"
import { computeKeyLookup } from "@/lib/security/auth"
import { generateFileId } from "@/lib/storage/r2"
import type { V3Scope } from "@/lib/http/v3/scopes"

export const KEY_PREFIX = "hsk_"
const HINT_LENGTH = 8
const LOOKUP_CACHE_TTL_S = 60
/** last_used_at is a UI nicety — never let it cost a write per request. */
const LAST_USED_THROTTLE_MS = 60_000

export interface ApiKeyRow {
  id: string
  user_id: string
  name: string
  hint: string
  scopes: string[]
  revoked: boolean
  created_at: string
  last_used_at: string | null
}

/** What withApiKey needs to authorise a call. */
export interface ResolvedKey {
  id: string
  userId: string
  scopes: string[]
  revoked: boolean
  /** 0-based position among the account's active keys, oldest first. */
  rank: number
}

function cacheKey(lookup: string): string {
  return `v3key:${lookup}`
}

/**
 * 32 random bytes, base64url, behind a fixed `hsk_` prefix. The prefix makes a
 * leaked key greppable and lets secret-scanning patterns match it later.
 */
export function generateApiKey(): string {
  return `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`
}

export function keyHint(key: string): string {
  return key.slice(0, KEY_PREFIX.length + HINT_LENGTH)
}

export async function createApiKey(
  userId: string,
  name: string,
  scopes: V3Scope[],
): Promise<{ key: string; row: ApiKeyRow }> {
  await ensureDatabase()
  const pool = getPool()
  const key = generateApiKey()

  const result = await pool.query<ApiKeyRow>(
    `INSERT INTO api_keys (id, user_id, name, key_lookup, hint, scopes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, name, hint, scopes, revoked, created_at, last_used_at`,
    [generateFileId(), userId, name, computeKeyLookup(key), keyHint(key), scopes],
  )

  return { key, row: result.rows[0] }
}

export async function listApiKeys(userId: string): Promise<ApiKeyRow[]> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query<ApiKeyRow>(
    `SELECT id, user_id, name, hint, scopes, revoked, created_at, last_used_at
     FROM api_keys
     WHERE user_id = $1 AND revoked = FALSE
     ORDER BY created_at ASC`,
    [userId],
  )
  return result.rows
}

/**
 * Revoke by id, scoped to the owner so one account can never revoke another's
 * key. Busts the lookup cache so a leaked key stops working immediately rather
 * than up to a minute later.
 */
export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query<{ key_lookup: string }>(
    `UPDATE api_keys SET revoked = TRUE
     WHERE id = $1 AND user_id = $2 AND revoked = FALSE
     RETURNING key_lookup`,
    [keyId, userId],
  )
  if (result.rows.length === 0) return false
  await bustCache(cacheKey(result.rows[0].key_lookup))
  return true
}

export async function countActiveApiKeys(userId: string): Promise<number> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM api_keys WHERE user_id = $1 AND revoked = FALSE`,
    [userId],
  )
  return Number(result.rows[0]?.count ?? 0)
}

/**
 * Resolve a presented key to its row plus its rank among the account's active
 * keys. Rank is computed in SQL rather than in the caller so the downgrade rule
 * can't disagree with itself between the API and the UI.
 *
 * Returns null when the key is unknown. A revoked key still resolves — the
 * caller turns that into the same 401 as unknown, but resolving it lets the
 * cache hold a negative-ish result instead of re-querying on every retry.
 */
export async function resolveApiKey(presentedKey: string): Promise<ResolvedKey | null> {
  const lookup = computeKeyLookup(presentedKey)

  return cached(cacheKey(lookup), LOOKUP_CACHE_TTL_S, async () => {
    await ensureDatabase()
    const pool = getPool()
    const result = await pool.query<{
      id: string
      user_id: string
      scopes: string[]
      revoked: boolean
      rank: string
    }>(
      `SELECT k.id, k.user_id, k.scopes, k.revoked,
              (SELECT COUNT(*) FROM api_keys older
                WHERE older.user_id = k.user_id
                  AND older.revoked = FALSE
                  AND older.created_at < k.created_at)::text AS rank
       FROM api_keys k
       WHERE k.key_lookup = $1`,
      [lookup],
    )

    const row = result.rows[0]
    if (!row) return null

    return {
      id: row.id,
      userId: row.user_id,
      scopes: row.scopes,
      revoked: row.revoked,
      rank: Number(row.rank),
    }
  })
}

/**
 * Stamp last_used_at at most once per key per minute. Fire-and-forget: a failure
 * here must never fail the request it decorates.
 */
export async function touchApiKey(keyId: string): Promise<void> {
  try {
    const pool = getPool()
    await pool.query(
      `UPDATE api_keys SET last_used_at = NOW()
       WHERE id = $1
         AND (last_used_at IS NULL OR last_used_at < NOW() - INTERVAL '1 millisecond' * $2::bigint)`,
      [keyId, LAST_USED_THROTTLE_MS],
    )
  } catch (err) {
    console.warn("[v3] last_used_at update failed:", (err as Error).message)
  }
}
