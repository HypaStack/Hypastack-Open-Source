import { getPool, ensureDatabase, getClient } from '@/lib/data/db'
import { cached, bustCache } from '@/lib/data/cache'
import { bustRouteCache } from '@/lib/http/routeCache'
import { scheduleFileExpiry } from '@/lib/expiryScheduler'
import { randomUUID, webcrypto } from 'node:crypto'
import { errorMessage, errorCode } from "@/lib/errors"

export interface FileRecord {
  id: string
  r2_key: string
  original_name: string
  file_size: number
  content_type: string
  upload_date: Date
  expires_at: Date
  burn_on_read: 0 | 1 | 2
  upload_completed: boolean
  upload_started_at: Date
  file_hash: string | null
  custom_filename?: string | null
  note?: string | null
  user_id?: string | null
  encryption_iv?: string | null
  encryption_auth_tag?: string | null
  starred?: boolean
  encryption_chunk_size?: number | null
  encryption_total_parts?: number | null
  folder_id?: string | null
  slug?: string | null
}

export interface CreateFileInput {
  id: string
  r2_key: string
  original_name: string
  file_size: number
  content_type: string
  expires_at: Date
  burn_on_read?: boolean
  custom_filename?: string | null
  note?: string | null
  user_id?: string | null
  encryption_iv?: string | null
  encryption_auth_tag?: string | null
  encryption_chunk_size?: number | null
  encryption_total_parts?: number | null
  slug?: string | null
}

export interface StagingInput {
  id: string
  r2_key: string
  original_name: string
  file_size: number
  content_type: string
  expires_at: Date
  burn_on_read?: boolean
  share_url: string
  custom_filename?: string | null
  note?: string | null
  user_id?: string | null
  encryption_chunk_size?: number | null
  encryption_total_parts?: number | null
  folder_id?: string | null
  slug?: string | null
  created_at?: Date
}

/**
 * Creates a staging record for an upload.
 * When `maxFileLinks` is provided the INSERT is wrapped in a CTE that
 * atomically counts both committed files AND in-flight staging rows for
 * this user. If the combined count already equals or exceeds the limit the
 * INSERT is skipped and the function returns `false` — eliminating the
 * TOCTOU race that allowed concurrent upload inits to exceed quota.
 */
export async function createStagingRecord(
  input: StagingInput,
  maxFileLinks?: number
): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()

  if (input.user_id && maxFileLinks !== undefined) {
    // Atomic quota-guarded insert: only proceeds if current count < limit.
    // $11 is user_id in the INSERT values; $17 is the SAME value but used
    // separately in WHERE subqueries to avoid Postgres type-inference conflict
    // (42P08) when the two user_id columns have different declared types
    // (e.g. text vs character varying).
    const result = await pool.query(
      `INSERT INTO upload_staging (id, r2_key, original_name, file_size, content_type, expires_at, burn_on_read, share_url, custom_filename, note, user_id, encryption_chunk_size, encryption_total_parts, folder_id, slug)
       SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
       WHERE (
         (SELECT COUNT(*) FROM basedrop_files WHERE user_id = $17 AND expires_at > NOW())
         +
         (SELECT COUNT(*) FROM upload_staging WHERE user_id = $17 AND created_at > NOW() - INTERVAL '2 hours')
       ) < $16`,
      [input.id, input.r2_key, input.original_name, input.file_size, input.content_type, input.expires_at, input.burn_on_read || false, input.share_url, input.custom_filename || null, input.note || null, input.user_id, input.encryption_chunk_size || null, input.encryption_total_parts || null, input.folder_id || null, input.slug || null, maxFileLinks, input.user_id]
    )
    return (result.rowCount ?? 0) > 0
  }

  // No quota guard needed (anonymous upload or no limit)
  await pool.query(
    `INSERT INTO upload_staging (id, r2_key, original_name, file_size, content_type, expires_at, burn_on_read, share_url, custom_filename, note, user_id, encryption_chunk_size, encryption_total_parts, folder_id, slug)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [input.id, input.r2_key, input.original_name, input.file_size, input.content_type, input.expires_at, input.burn_on_read || false, input.share_url, input.custom_filename || null, input.note || null, input.user_id || null, input.encryption_chunk_size || null, input.encryption_total_parts || null, input.folder_id || null, input.slug || null]
  )
  return true
}


export async function getStagingRecord(id: string): Promise<StagingInput | null> {
  await ensureDatabase()
  const pool = getPool()

  const result = await pool.query(
    `SELECT * FROM upload_staging WHERE id = $1`,
    [id]
  )

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    id: row.id,
    r2_key: row.r2_key,
    original_name: row.original_name,
    file_size: Number(row.file_size),
    content_type: row.content_type,
    expires_at: row.expires_at,
    burn_on_read: row.burn_on_read,
    share_url: row.share_url,
    custom_filename: row.custom_filename,
    note: row.note,
    user_id: row.user_id,
    encryption_chunk_size: row.encryption_chunk_size ? Number(row.encryption_chunk_size) : null,
    encryption_total_parts: row.encryption_total_parts ? Number(row.encryption_total_parts) : null,
    folder_id: row.folder_id,
    slug: row.slug,
    created_at: row.created_at,
  }
}

export async function promoteStagingToFile(id: string, fileHash?: string): Promise<boolean> {
  await ensureDatabase()
  const client = await getClient()

  try {
    await client.query('BEGIN')

    const result = await client.query(
      `SELECT * FROM upload_staging WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      await client.query('ROLLBACK')
      return false
    }

    const staging = result.rows[0]

    // Re-anchor the lifetime to completion time. expires_at was computed at
    // upload init; for short custom expirations (down to 1 minute) a slow upload
    // could otherwise leave the file already expired when it finishes. The
    // intended duration is staging.expires_at - staging.created_at, so we re-add
    // it from now.
    const durationMs = new Date(staging.expires_at).getTime() - new Date(staging.created_at).getTime()
    const finalExpiresAt = durationMs > 0 ? new Date(Date.now() + durationMs) : staging.expires_at

    await client.query(
      `INSERT INTO basedrop_files (id, r2_key, original_name, file_size, content_type, expires_at, burn_on_read, upload_completed, file_hash, custom_filename, note, user_id, encryption_chunk_size, encryption_total_parts, folder_id, slug)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [staging.id, staging.r2_key, staging.original_name, staging.file_size, staging.content_type, finalExpiresAt, staging.burn_on_read ? 1 : 0, fileHash || null, staging.custom_filename, staging.note, staging.user_id || null, staging.encryption_chunk_size || null, staging.encryption_total_parts || null, staging.folder_id || null, staging.slug || null]
    )

    await client.query(
      `DELETE FROM upload_staging WHERE id = $1`,
      [id]
    )

    await client.query('COMMIT')
    const uid = staging.user_id
    if (uid) {
      await bustCache(`user:${uid}:files`, `user:${uid}:file-stats`, `user:${uid}:storage`)
      await bustRouteCache(uid, 'files:list')
    }
    scheduleFileExpiry(staging.id, staging.r2_key, uid ?? null, finalExpiresAt)
    return true

  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function deleteStagingRecord(id: string): Promise<void> {
  const pool = getPool()
  await pool.query(`DELETE FROM upload_staging WHERE id = $1`, [id])
}

export async function cleanupExpiredStaging(): Promise<{ cleaned: number; errors: string[] }> {
  await ensureDatabase()
  const pool = getPool()
  const errors: string[] = []
  let cleaned = 0

  try {
    const MAX_BATCHES = 3 // max 1500 staging records per run
    let batches = 0

    while (batches < MAX_BATCHES) {
      const result = await pool.query(
        `SELECT id, r2_key FROM upload_staging WHERE created_at < NOW() - INTERVAL '2 hours' LIMIT 500`
      )

      if (result.rows.length === 0) break
      batches++

      for (const record of result.rows) {
        try {
          const { deleteByKey } = await import('@/lib/storage/r2')
          await deleteByKey(record.r2_key)
        } catch { /* r2 deletion best-effort */ }

        try {
          await pool.query(`DELETE FROM upload_staging WHERE id = $1`, [record.id])
          cleaned++
        } catch (error) {
          errors.push(`Failed to cleanup staging ${record.id}: ${errorMessage(error)}`)
        }
      }
    }

    return { cleaned, errors }
  } catch (error) {
    return { cleaned, errors: [`Staging cleanup failed: ${errorMessage(error)}`] }
  }
}

export async function createFileRecord(input: CreateFileInput): Promise<void> {
  await ensureDatabase()
  const pool = getPool()
  await pool.query(
    `INSERT INTO basedrop_files (id, r2_key, original_name, file_size, content_type, expires_at, burn_on_read, upload_completed, custom_filename, note, user_id, encryption_iv, encryption_auth_tag, slug)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $9, $10, $11, $12, $13)`,
    [input.id, input.r2_key, input.original_name, input.file_size, input.content_type, input.expires_at, input.burn_on_read ? 1 : 0, input.custom_filename || null, input.note || null, input.user_id || null, input.encryption_iv || null, input.encryption_auth_tag || null, input.slug || null]
  )
  if (input.user_id) await bustCache(`user:${input.user_id}:files`, `user:${input.user_id}:file-stats`, `user:${input.user_id}:storage`)
  scheduleFileExpiry(input.id, input.r2_key, input.user_id ?? null, input.expires_at)
}

export async function getFileById(id: string, retries = 2): Promise<FileRecord | null> {
  try {
    await ensureDatabase()
    const pool = getPool()
    const result = await pool.query(
      `SELECT * FROM basedrop_files WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      r2_key: row.r2_key,
      original_name: row.original_name,
      file_size: Number(row.file_size),
      content_type: row.content_type,
      upload_date: row.upload_date,
      expires_at: row.expires_at,
      burn_on_read: (row.burn_on_read ?? 0) as 0 | 1 | 2,
      upload_completed: row.upload_completed,
      upload_started_at: row.upload_started_at,
      file_hash: row.file_hash,
      custom_filename: row.custom_filename,
      note: row.note,
      user_id: row.user_id,
      encryption_iv: row.encryption_iv,
      encryption_auth_tag: row.encryption_auth_tag,
      encryption_chunk_size: row.encryption_chunk_size ? Number(row.encryption_chunk_size) : null,
      encryption_total_parts: row.encryption_total_parts ? Number(row.encryption_total_parts) : null,
      folder_id: row.folder_id,
      slug: row.slug,
    }
  } catch (error) {
    if (retries > 0 && (errorCode(error) === 'ECONNREFUSED' || errorCode(error) === 'ECONNRESET' || errorCode(error) === '57P01')) {
      await new Promise(r => setTimeout(r, 100))
      return getFileById(id, retries - 1)
    }
    console.error(`[DB] Error getting file:`, errorMessage(error), '- Code:', errorCode(error))
    return null
  }
}

/**
 * Resolve a public `/d/{value}` segment to a file by either its random id OR
 * its custom slug. Id matches win ties (`ORDER BY (id = $1) DESC`), so a custom
 * slug can never shadow an existing random file id.
 */
export async function getFileBySlugOrId(value: string, retries = 2): Promise<FileRecord | null> {
  try {
    await ensureDatabase()
    const pool = getPool()
    const result = await pool.query(
      `SELECT * FROM basedrop_files WHERE id = $1 OR slug = $1 ORDER BY (id = $1) DESC LIMIT 1`,
      [value]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      r2_key: row.r2_key,
      original_name: row.original_name,
      file_size: Number(row.file_size),
      content_type: row.content_type,
      upload_date: row.upload_date,
      expires_at: row.expires_at,
      burn_on_read: (row.burn_on_read ?? 0) as 0 | 1 | 2,
      upload_completed: row.upload_completed,
      upload_started_at: row.upload_started_at,
      file_hash: row.file_hash,
      custom_filename: row.custom_filename,
      note: row.note,
      user_id: row.user_id,
      encryption_iv: row.encryption_iv,
      encryption_auth_tag: row.encryption_auth_tag,
      encryption_chunk_size: row.encryption_chunk_size ? Number(row.encryption_chunk_size) : null,
      encryption_total_parts: row.encryption_total_parts ? Number(row.encryption_total_parts) : null,
      folder_id: row.folder_id,
      slug: row.slug,
    }
  } catch (error) {
    if (retries > 0 && (errorCode(error) === 'ECONNREFUSED' || errorCode(error) === 'ECONNRESET' || errorCode(error) === '57P01')) {
      await new Promise(r => setTimeout(r, 100))
      return getFileBySlugOrId(value, retries - 1)
    }
    console.error(`[DB] Error resolving file by slug/id:`, errorMessage(error), '- Code:', errorCode(error))
    return null
  }
}

/**
 * True if a slug is unavailable — claimed by a committed file or an in-flight
 * staging row (last 2h, matching the staging quota window). The `id = $1` clause
 * is defense-in-depth: the 9-char slug minimum already makes a slug equal to an
 * 8-char file id impossible, but the check costs nothing and survives any future
 * change to the id format. Best-effort pre-check; the partial unique index is
 * the real race guard.
 */
export async function isSlugTaken(slug: string): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(
    `SELECT 1 FROM basedrop_files WHERE slug = $1 OR id = $1
     UNION ALL
     SELECT 1 FROM upload_staging WHERE (slug = $1 OR id = $1) AND created_at > NOW() - INTERVAL '2 hours'
     LIMIT 1`,
    [slug]
  )
  return result.rows.length > 0
}

/**
 * Given a base slug the user wanted but that's taken, return up to `max`
 * concrete alternatives that are currently free.
 */
export async function suggestAvailableSlugs(base: string, max = 3): Promise<string[]> {
  const { generateSlugCandidates } = await import('@/lib/validation/slug')
  const candidates = generateSlugCandidates(base)
  const available: string[] = []
  for (const candidate of candidates) {
    if (available.length >= max) break
    if (!(await isSlugTaken(candidate))) available.push(candidate)
  }
  return available
}


export async function markUploadComplete(id: string, fileHash?: string): Promise<void> {
  await ensureDatabase()
  const pool = getPool()
  if (fileHash) {
    await pool.query(
      `UPDATE basedrop_files SET upload_completed = TRUE, file_hash = $1 WHERE id = $2`,
      [fileHash, id]
    )
  } else {
    await pool.query(
      `UPDATE basedrop_files SET upload_completed = TRUE WHERE id = $1`,
      [id]
    )
  }
}

export async function getExpiredFiles(limit = 500): Promise<FileRecord[]> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(
    `SELECT * FROM basedrop_files WHERE expires_at < NOW() LIMIT $1`,
    [limit]
  )

  return result.rows.map(row => ({
    id: row.id,
    r2_key: row.r2_key,
    original_name: row.original_name,
    file_size: Number(row.file_size),
    content_type: row.content_type,
    upload_date: row.upload_date,
    expires_at: row.expires_at,
    burn_on_read: (row.burn_on_read ?? 0) as 0 | 1 | 2,
    upload_completed: row.upload_completed,
    upload_started_at: row.upload_started_at,
    file_hash: row.file_hash,
    folder_id: row.folder_id,
  }))
}

/**
 * Files committed and expiring within the next hour. Used by the expiry
 * scheduler to arm precise deletion timers (on startup and each hourly tick).
 */
export async function getFilesExpiringWithinHour(): Promise<
  { id: string; r2_key: string; user_id: string | null; expires_at: Date }[]
> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(
    `SELECT id, r2_key, user_id, expires_at FROM basedrop_files
     WHERE expires_at > NOW() AND expires_at <= NOW() + INTERVAL '1 hour'
     LIMIT 2000`
  )
  return result.rows.map(row => ({
    id: row.id,
    r2_key: row.r2_key,
    user_id: row.user_id,
    expires_at: row.expires_at,
  }))
}

export async function deleteFileRecord(id: string): Promise<void> {
  await ensureDatabase()
  const pool = getPool()
  await pool.query(
    `DELETE FROM basedrop_files WHERE id = $1`,
    [id]
  )
}

export async function getFilesByUserId(userId: string): Promise<FileRecord[]> {
  return cached(`user:${userId}:files`, 120, async () => {
    await ensureDatabase()
    const pool = getPool()

    const result = await pool.query(
      `SELECT id, original_name, file_size, content_type, upload_date, expires_at,
              burn_on_read, upload_completed, upload_started_at,
              custom_filename, note, starred, folder_id
       FROM basedrop_files WHERE user_id = $1 AND expires_at > NOW() ORDER BY upload_date DESC`,
      [userId]
    )

    return result.rows.map(row => ({
      id: row.id,
      r2_key: '',
      original_name: row.original_name,
      file_size: Number(row.file_size),
      content_type: row.content_type,
      upload_date: row.upload_date,
      expires_at: row.expires_at,
      burn_on_read: (row.burn_on_read ?? 0) as 0 | 1 | 2,
      upload_completed: row.upload_completed,
      upload_started_at: row.upload_started_at,
      file_hash: null,
      custom_filename: row.custom_filename,
      note: row.note,
      starred: row.starred,
      folder_id: row.folder_id,
    }))
  })
}

export async function toggleFileStarred(fileId: string, userId: string, starred: boolean): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()

  const result = await pool.query(
    `UPDATE basedrop_files SET starred = $1 WHERE id = $2 AND user_id = $3`,
    [starred, fileId, userId]
  )

  await bustCache(`user:${userId}:files`)
  return (result.rowCount ?? 0) > 0
}

export async function getUserFileStats(userId: string): Promise<{
  totalUploads: number
  activeFiles: number
  storageUsed: number
}> {
  return cached(`user:${userId}:file-stats`, 120, async () => {
    await ensureDatabase()
    const pool = getPool()

    const result = await pool.query(
      `SELECT
        COUNT(*) as total_uploads,
        COUNT(*) FILTER (WHERE expires_at > NOW()) as active_files,
        COALESCE(SUM(file_size), 0) as storage_used
       FROM basedrop_files WHERE user_id = $1`,
      [userId]
    )

    const row = result.rows[0]
    return {
      totalUploads: Number(row.total_uploads),
      activeFiles: Number(row.active_files),
      storageUsed: Number(row.storage_used),
    }
  })
}

export async function getFilesByIds(ids: string[], userId: string): Promise<FileRecord[]> {
  if (ids.length === 0) return []
  await ensureDatabase()
  const pool = getPool()

  const result = await pool.query(
    `SELECT * FROM basedrop_files WHERE id = ANY($1) AND user_id = $2`,
    [ids, userId]
  )

  return result.rows.map(row => ({
    id: row.id,
    r2_key: row.r2_key,
    original_name: row.original_name,
    file_size: Number(row.file_size),
    content_type: row.content_type,
    upload_date: row.upload_date,
    expires_at: row.expires_at,
    burn_on_read: (row.burn_on_read ?? 0) as 0 | 1 | 2,
    upload_completed: row.upload_completed,
    upload_started_at: row.upload_started_at,
    file_hash: row.file_hash,
    custom_filename: row.custom_filename,
    note: row.note,
    user_id: row.user_id,
    encryption_iv: row.encryption_iv,
    encryption_auth_tag: row.encryption_auth_tag,
    encryption_chunk_size: row.encryption_chunk_size ? Number(row.encryption_chunk_size) : null,
    encryption_total_parts: row.encryption_total_parts ? Number(row.encryption_total_parts) : null,
    folder_id: row.folder_id,
    starred: row.starred,
  }))
}

export async function deleteFilesByIds(ids: string[], userId: string): Promise<number> {
  if (ids.length === 0) return 0
  await ensureDatabase()
  const pool = getPool()

  const result = await pool.query(
    `DELETE FROM basedrop_files WHERE id = ANY($1) AND user_id = $2`,
    [ids, userId]
  )

  await bustCache(`user:${userId}:files`, `user:${userId}:file-stats`, `user:${userId}:storage`)
  await bustRouteCache(userId, 'files:list')
  return result.rowCount ?? 0
}


export async function markFileBurned(fileId: string): Promise<{ success: boolean }> {
  await ensureDatabase()
  const client = await getClient()

  try {
    await client.query('BEGIN')

    const result = await client.query(
      `SELECT burn_on_read FROM basedrop_files WHERE id = $1 FOR UPDATE`,
      [fileId]
    )

    if (result.rows.length === 0) {
      await client.query('ROLLBACK')
      return { success: false }
    }

    const record = result.rows[0]
    if (record.burn_on_read === 2) {
      await client.query('ROLLBACK')
      return { success: false }
    }

    await client.query(
      `UPDATE basedrop_files SET burn_on_read = 2, burned_at = NOW() WHERE id = $1`,
      [fileId]
    )

    await client.query('COMMIT')
    return { success: true }

  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
