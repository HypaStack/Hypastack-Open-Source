import { getPool, ensureDatabase } from '@/lib/data/db'

export interface BlacklistedIp {
  ip_hash: string
  reason: string | null
  created_at: Date
}

export async function isIpBlacklisted(ipHash: string): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(`SELECT 1 FROM blacklisted_ips WHERE ip_hash = $1`, [ipHash])
  return result.rows.length > 0
}

export async function blacklistIp(ipHash: string, reason: string): Promise<void> {
  await ensureDatabase()
  const pool = getPool()
  await pool.query(
    `INSERT INTO blacklisted_ips (ip_hash, reason) VALUES ($1, $2) ON CONFLICT (ip_hash) DO NOTHING`,
    [ipHash, reason]
  )
}

export async function listBlacklistedIps(): Promise<BlacklistedIp[]> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(`SELECT ip_hash, reason, created_at FROM blacklisted_ips ORDER BY created_at DESC`)
  return result.rows
}

export async function removeIpFromBlacklist(ipHash: string): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(`DELETE FROM blacklisted_ips WHERE ip_hash = $1`, [ipHash])
  return (result.rowCount ?? 0) > 0
}
