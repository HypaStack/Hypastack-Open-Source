import crypto from 'node:crypto'
import { getPool, ensureDatabase } from '@/lib/data/db'

export interface InviteCodeRow {
  code: string
  used_by: string | null
  used_at: Date | null
  created_at: Date
}

export async function createInviteCodes(count: number): Promise<string[]> {
  await ensureDatabase()
  const pool = getPool()

  const codes = Array.from({ length: count }, () => crypto.randomBytes(6).toString('hex'))
  for (const code of codes) {
    await pool.query(`INSERT INTO invite_codes (code) VALUES ($1)`, [code])
  }
  return codes
}

export async function listInviteCodes(opts: { limit?: number; offset?: number } = {}): Promise<InviteCodeRow[]> {
  await ensureDatabase()
  const pool = getPool()
  const limit = Math.min(opts.limit ?? 100, 200)
  const offset = opts.offset ?? 0

  const result = await pool.query(
    `SELECT code, used_by, used_at, created_at FROM invite_codes ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  )
  return result.rows
}

// Only deletes codes nobody has used yet, an already-claimed code stays as
// the record of which account used it.
export async function revokeInviteCode(code: string): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(`DELETE FROM invite_codes WHERE code = $1 AND used_by IS NULL`, [code])
  return (result.rowCount ?? 0) > 0
}
