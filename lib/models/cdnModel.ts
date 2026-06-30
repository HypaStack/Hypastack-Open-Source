import { getPool, ensureDatabase } from '@/lib/data/db'
import { cached, bustCache } from '@/lib/data/cache'
import { bustRouteCache } from '@/lib/http/routeCache'
import crypto from 'crypto'

export interface CdnAsset {
  id: string
  user_id: string
  r2_key: string
  original_name: string
  file_size: number
  content_type: string
  cdn_url: string
  folder_id: string | null
  slug: string | null
  created_at: Date
}

export interface CreateCdnAssetInput {
  id: string
  user_id: string
  r2_key: string
  original_name: string
  file_size: number
  content_type: string
  cdn_url: string
  folder_id?: string | null
  slug?: string | null
}

export function generateCdnId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(crypto.randomInt(0, chars.length))
  }
  return result
}

export async function createCdnAsset(input: CreateCdnAssetInput): Promise<void> {
  await ensureDatabase()
  const pool = getPool()
  await pool.query(
    `INSERT INTO cdn_assets (id, user_id, r2_key, original_name, file_size, content_type, cdn_url, folder_id, slug)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [input.id, input.user_id, input.r2_key, input.original_name, input.file_size, input.content_type, input.cdn_url, input.folder_id || null, input.slug || null]
  )
  await bustCache(`user:${input.user_id}:cdn-assets`, `user:${input.user_id}:cdn-stats`, `user:${input.user_id}:storage`)
}

export async function createCdnAssetsBatch(inputs: CreateCdnAssetInput[]): Promise<void> {
  if (inputs.length === 0) return
  if (inputs.length === 1) return createCdnAsset(inputs[0])
  await ensureDatabase()
  const pool = getPool()

  const COLS = 9
  const values: unknown[] = []
  const placeholders = inputs.map((input, i) => {
    const base = i * COLS
    values.push(
      input.id,
      input.user_id,
      input.r2_key,
      input.original_name,
      input.file_size,
      input.content_type,
      input.cdn_url,
      input.folder_id || null,
      input.slug || null,
    )
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9})`
  }).join(', ')

  await pool.query(
    `INSERT INTO cdn_assets (id, user_id, r2_key, original_name, file_size, content_type, cdn_url, folder_id, slug)
     VALUES ${placeholders}`,
    values
  )
  const userId = inputs[0].user_id
  await bustCache(`user:${userId}:cdn-assets`, `user:${userId}:cdn-stats`, `user:${userId}:storage`)
  await bustRouteCache(userId, 'cdn:assets')
}

export async function getCdnAssetsByUserId(userId: string): Promise<CdnAsset[]> {
  return cached(`user:${userId}:cdn-assets`, 120, async () => {
    await ensureDatabase()
    const pool = getPool()

    const result = await pool.query(
      `SELECT * FROM cdn_assets WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    )

    return result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      r2_key: row.r2_key,
      original_name: row.original_name,
      file_size: Number(row.file_size),
      content_type: row.content_type,
      cdn_url: row.cdn_url,
      folder_id: row.folder_id || null,
      slug: row.slug || null,
      created_at: row.created_at,
    }))
  })
}

/**
 * True if a CDN slug is unavailable. The slug becomes the public path segment
 * (`/cdn/<slug>/<name>`), so it must be unique across cdn_assets. The `id = $1`
 * clause is defense-in-depth against a slug colliding with a random asset id.
 */
export async function isCdnSlugTaken(slug: string): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(
    `SELECT 1 FROM cdn_assets WHERE slug = $1 OR id = $1 LIMIT 1`,
    [slug]
  )
  return result.rows.length > 0
}

export async function suggestAvailableCdnSlugs(base: string, max = 3): Promise<string[]> {
  const { generateSlugCandidates } = await import('@/lib/validation/slug')
  const candidates = generateSlugCandidates(base)
  const available: string[] = []
  for (const candidate of candidates) {
    if (available.length >= max) break
    if (!(await isCdnSlugTaken(candidate))) available.push(candidate)
  }
  return available
}

export async function getCdnAssetById(id: string): Promise<CdnAsset | null> {
  await ensureDatabase()
  const pool = getPool()

  const result = await pool.query(
    `SELECT * FROM cdn_assets WHERE id = $1`,
    [id]
  )

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    id: row.id,
    user_id: row.user_id,
    r2_key: row.r2_key,
    original_name: row.original_name,
    file_size: Number(row.file_size),
    content_type: row.content_type,
    cdn_url: row.cdn_url,
    folder_id: row.folder_id || null,
    slug: row.slug || null,
    created_at: row.created_at,
  }
}

export async function deleteCdnAsset(id: string, userId: string): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()

  const result = await pool.query(
    `DELETE FROM cdn_assets WHERE id = $1 AND user_id = $2`,
    [id, userId]
  )

  return (result.rowCount ?? 0) > 0
}

export async function getCdnAssetsByIds(ids: string[], userId: string): Promise<CdnAsset[]> {
  if (ids.length === 0) return []
  await ensureDatabase()
  const pool = getPool()

  const result = await pool.query(
    `SELECT * FROM cdn_assets WHERE id = ANY($1) AND user_id = $2`,
    [ids, userId]
  )

  return result.rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    r2_key: row.r2_key,
    original_name: row.original_name,
    file_size: Number(row.file_size),
    content_type: row.content_type,
    cdn_url: row.cdn_url,
    folder_id: row.folder_id || null,
    slug: row.slug || null,
    created_at: row.created_at,
  }))
}

export async function deleteCdnAssetsByIds(ids: string[], userId: string): Promise<number> {
  if (ids.length === 0) return 0
  await ensureDatabase()
  const pool = getPool()

  const result = await pool.query(
    `DELETE FROM cdn_assets WHERE id = ANY($1) AND user_id = $2`,
    [ids, userId]
  )

  await bustCache(`user:${userId}:cdn-assets`, `user:${userId}:cdn-stats`, `user:${userId}:storage`)
  await bustRouteCache(userId, 'cdn:assets')

  return result.rowCount ?? 0
}

export async function getUserCdnStats(userId: string): Promise<{
  totalAssets: number
  totalSize: number
}> {
  return cached(`user:${userId}:cdn-stats`, 120, async () => {
    await ensureDatabase()
    const pool = getPool()

    const result = await pool.query(
      `SELECT COUNT(*) as total_assets, COALESCE(SUM(file_size), 0) as total_size
       FROM cdn_assets WHERE user_id = $1`,
      [userId]
    )

    const row = result.rows[0]
    return {
      totalAssets: Number(row.total_assets),
      totalSize: Number(row.total_size),
    }
  })
}

export async function getTotalStorageUsed(userId: string): Promise<number> {
  return cached(`user:${userId}:storage`, 60, async () => {
    await ensureDatabase()
    const pool = getPool()

    const result = await pool.query(
      `SELECT
        COALESCE((SELECT SUM(file_size) FROM basedrop_files WHERE user_id = $1), 0) +
        COALESCE((SELECT SUM(file_size) FROM cdn_assets WHERE user_id = $1), 0) +
        COALESCE((SELECT SUM(file_size) FROM forum_files WHERE user_id = $1), 0) as total_storage`,
      [userId]
    )

    return Number(result.rows[0]?.total_storage || 0)
  })
}

export async function updateCdnAssetAfterSwap(
  id: string,
  userId: string,
  updates: { file_size: number; content_type: string }
): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()

  const result = await pool.query(
    `UPDATE cdn_assets SET file_size = $1, content_type = $2 WHERE id = $3 AND user_id = $4`,
    [updates.file_size, updates.content_type, id, userId]
  )

  await bustCache(`user:${userId}:cdn-assets`, `user:${userId}:cdn-stats`, `user:${userId}:storage`)
  await bustRouteCache(userId, 'cdn:assets')

  return (result.rowCount ?? 0) > 0
}
