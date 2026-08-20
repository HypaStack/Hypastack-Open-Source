import crypto from 'node:crypto'
import { getPool, ensureDatabase } from '@/lib/data/db'

export interface InviteCodeRow {
  code: string
  max_uses: number
  uses_count: number
  redeemed_by: string[]
  created_at: Date
}

export async function createInviteCodes(count: number, maxUses: number): Promise<string[]> {
  await ensureDatabase()
  const pool = getPool()

  const codes = Array.from({ length: count }, () => crypto.randomBytes(6).toString('hex'))
  for (const code of codes) {
    await pool.query(`INSERT INTO invite_codes (code, max_uses) VALUES ($1, $2)`, [code, maxUses])
  }
  return codes
}

// A hand-picked code instead of a random one. Returns false if that code is
// already taken, codes are the primary key so this can't silently collide.
export async function createCustomInviteCode(code: string, maxUses: number): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()
  try {
    await pool.query(`INSERT INTO invite_codes (code, max_uses) VALUES ($1, $2)`, [code, maxUses])
    return true
  } catch (err) {
    if ((err as { code?: string }).code === '23505') return false // unique_violation
    throw err
  }
}

export async function listInviteCodes(opts: { limit?: number; offset?: number } = {}): Promise<InviteCodeRow[]> {
  await ensureDatabase()
  const pool = getPool()
  const limit = Math.min(opts.limit ?? 100, 200)
  const offset = opts.offset ?? 0

  const result = await pool.query(
    // Limit before aggregating, otherwise every redemption of every code is
    // grouped just to return one page of them.
    `WITH page AS (
       SELECT code, max_uses, uses_count, created_at
       FROM invite_codes
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2
     )
     SELECT page.code, page.max_uses, page.uses_count, page.created_at,
            COALESCE(array_agg(r.user_id) FILTER (WHERE r.user_id IS NOT NULL), '{}') AS redeemed_by
     FROM page
     LEFT JOIN invite_code_redemptions r ON r.code = page.code
     GROUP BY page.code, page.max_uses, page.uses_count, page.created_at
     ORDER BY page.created_at DESC`,
    [limit, offset]
  )
  return result.rows
}

// Deleting the code just stops future redemptions, past ones stay recorded
// in invite_code_redemptions regardless.
export async function revokeInviteCode(code: string): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(`DELETE FROM invite_codes WHERE code = $1`, [code])
  return (result.rowCount ?? 0) > 0
}
