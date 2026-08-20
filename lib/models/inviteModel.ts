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
    `SELECT ic.code, ic.max_uses, ic.uses_count, ic.created_at,
            COALESCE(array_agg(r.user_id) FILTER (WHERE r.user_id IS NOT NULL), '{}') AS redeemed_by
     FROM invite_codes ic
     LEFT JOIN invite_code_redemptions r ON r.code = ic.code
     GROUP BY ic.code, ic.max_uses, ic.uses_count, ic.created_at
     ORDER BY ic.created_at DESC
     LIMIT $1 OFFSET $2`,
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
