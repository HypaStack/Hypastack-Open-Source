import { getPool, ensureDatabase, getClient } from './db'
import { randomUUID, webcrypto } from 'node:crypto'

export interface FileRecord {
  id: string
  r2_key: string
  original_name: string
  file_size: number
  content_type: string
  upload_date: Date
  expires_at: Date
  pin: string | null
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
}

export interface CreateFileInput {
  id: string
  r2_key: string
  original_name: string
  file_size: number
  content_type: string
  expires_at: Date
  pin?: string | null
  burn_on_read?: boolean
  custom_filename?: string | null
  note?: string | null
  user_id?: string | null
  encryption_iv?: string | null
  encryption_auth_tag?: string | null
  encryption_chunk_size?: number | null
  encryption_total_parts?: number | null
}

export interface StagingInput {
  id: string
  r2_key: string
  original_name: string
  file_size: number
  content_type: string
  expires_at: Date
  pin?: string | null
  burn_on_read?: boolean
  share_url: string
  custom_filename?: string | null
  note?: string | null
  user_id?: string | null
  encryption_chunk_size?: number | null
  encryption_total_parts?: number | null
  folder_id?: string | null
}

export async function createStagingRecord(input: StagingInput): Promise<void> {
  await ensureDatabase()
  const pool = getPool()
  await pool.query(
    `INSERT INTO upload_staging (id, r2_key, original_name, file_size, content_type, expires_at, pin, burn_on_read, share_url, custom_filename, note, user_id, encryption_chunk_size, encryption_total_parts, folder_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [input.id, input.r2_key, input.original_name, input.file_size, input.content_type, input.expires_at, input.pin || null, input.burn_on_read || false, input.share_url, input.custom_filename || null, input.note || null, input.user_id || null, input.encryption_chunk_size || null, input.encryption_total_parts || null, input.folder_id || null]
  )
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
    pin: row.pin,
    burn_on_read: row.burn_on_read,
    share_url: row.share_url,
    custom_filename: row.custom_filename,
    note: row.note,
    user_id: row.user_id,
    encryption_chunk_size: row.encryption_chunk_size ? Number(row.encryption_chunk_size) : null,
    encryption_total_parts: row.encryption_total_parts ? Number(row.encryption_total_parts) : null,
    folder_id: row.folder_id,
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

    await client.query(
      `INSERT INTO basedrop_files (id, r2_key, original_name, file_size, content_type, expires_at, pin, burn_on_read, upload_completed, file_hash, custom_filename, note, user_id, encryption_chunk_size, encryption_total_parts, folder_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $10, $11, $12, $13, $14, $15)`,
      [staging.id, staging.r2_key, staging.original_name, staging.file_size, staging.content_type, staging.expires_at, staging.pin, staging.burn_on_read ? 1 : 0, fileHash || null, staging.custom_filename, staging.note, staging.user_id || null, staging.encryption_chunk_size || null, staging.encryption_total_parts || null, staging.folder_id || null]
    )

    await client.query(
      `DELETE FROM upload_staging WHERE id = $1`,
      [id]
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
    const result = await pool.query(
      `SELECT id, r2_key FROM upload_staging WHERE created_at < NOW() - INTERVAL '2 hours'`
    )

    for (const record of result.rows) {
      try {
        const fileName = record.r2_key.split('/').pop() || ''
        try {
          const { deleteByKey } = await import('./r2')
          await deleteByKey(record.r2_key)
        } catch {
          // R2 file may not exist
        }

        await pool.query(
          `DELETE FROM upload_staging WHERE id = $1`,
          [record.id]
        )

        cleaned++
      } catch (error: any) {
        errors.push(`Failed to cleanup ${record.id}: ${error.message}`)
      }
    }

    return { cleaned, errors }
  } catch (error: any) {
    return { cleaned, errors: [`Cleanup failed: ${error.message}`] }
  }
}

export async function createFileRecord(input: CreateFileInput): Promise<void> {
  await ensureDatabase()
  const pool = getPool()
  await pool.query(
    `INSERT INTO basedrop_files (id, r2_key, original_name, file_size, content_type, expires_at, pin, burn_on_read, upload_completed, custom_filename, note, user_id, encryption_iv, encryption_auth_tag)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $10, $11, $12, $13)`,
    [input.id, input.r2_key, input.original_name, input.file_size, input.content_type, input.expires_at, input.pin || null, input.burn_on_read ? 1 : 0, input.custom_filename || null, input.note || null, input.user_id || null, input.encryption_iv || null, input.encryption_auth_tag || null]
  )
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
      pin: row.pin,
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
    }
  } catch (error: any) {
    if (retries > 0 && (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === '57P01')) {
      await new Promise(r => setTimeout(r, 100))
      return getFileById(id, retries - 1)
    }
    console.error(`[DB] Error getting file:`, error.message, '- Code:', error.code)
    return null
  }
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

export async function getIncompleteUploads(olderThanMinutes: number = 60): Promise<FileRecord[]> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(
    `SELECT * FROM basedrop_files WHERE upload_completed = FALSE AND upload_started_at < NOW() - INTERVAL '1 minute' * $1`,
    [olderThanMinutes]
  )

  return result.rows.map(row => ({
    id: row.id,
    r2_key: row.r2_key,
    original_name: row.original_name,
    file_size: Number(row.file_size),
    content_type: row.content_type,
    upload_date: row.upload_date,
    expires_at: row.expires_at,
    pin: row.pin,
    burn_on_read: (row.burn_on_read ?? 0) as 0 | 1 | 2,
    upload_completed: row.upload_completed,
    upload_started_at: row.upload_started_at,
    file_hash: row.file_hash,
    folder_id: row.folder_id,
  }))
}

export async function getExpiredFiles(): Promise<FileRecord[]> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(
    `SELECT * FROM basedrop_files WHERE expires_at < NOW()`
  )

  return result.rows.map(row => ({
    id: row.id,
    r2_key: row.r2_key,
    original_name: row.original_name,
    file_size: Number(row.file_size),
    content_type: row.content_type,
    upload_date: row.upload_date,
    expires_at: row.expires_at,
    pin: row.pin,
    burn_on_read: (row.burn_on_read ?? 0) as 0 | 1 | 2,
    upload_completed: row.upload_completed,
    upload_started_at: row.upload_started_at,
    file_hash: row.file_hash,
    folder_id: row.folder_id,
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

export async function isFileValid(id: string): Promise<{ valid: boolean; record?: FileRecord }> {
  const record = await getFileById(id)

  if (!record) {
    return { valid: false }
  }

  if (!record.upload_completed) {
    return { valid: false, record }
  }

  const now = new Date()
  if (now > record.expires_at) {
    return { valid: false, record }
  }

  return { valid: true, record }
}

export async function getFileStats(): Promise<{
  totalFiles: number
  totalSize: number
  activeFiles: number
  expiredFiles: number
}> {
  await ensureDatabase()
  const pool = getPool()

  const result = await pool.query(`
    SELECT
      COUNT(*) as total_files,
      COALESCE(SUM(file_size), 0) as total_size,
      COUNT(*) FILTER (WHERE expires_at > NOW()) as active_files,
      COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_files
    FROM basedrop_files
  `)

  const row = result.rows[0]
  return {
    totalFiles: Number(row.total_files),
    totalSize: Number(row.total_size),
    activeFiles: Number(row.active_files),
    expiredFiles: Number(row.expired_files),
  }
}

export async function getFileHash(fileId: string): Promise<string | null> {
  await ensureDatabase()
  const pool = getPool()

  const result = await pool.query(
    `SELECT file_hash FROM basedrop_files WHERE id = $1`,
    [fileId]
  )

  return result.rows.length > 0 ? result.rows[0].file_hash : null
}

export async function getFilesByUserId(userId: string): Promise<FileRecord[]> {
  await ensureDatabase()
  const pool = getPool()

  const result = await pool.query(
    `SELECT id, original_name, file_size, content_type, upload_date, expires_at,
            pin, burn_on_read, upload_completed, upload_started_at,
            custom_filename, note, starred, folder_id
     FROM basedrop_files WHERE user_id = $1 ORDER BY upload_date DESC`,
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
    pin: row.pin,
    burn_on_read: (row.burn_on_read ?? 0) as 0 | 1 | 2,
    upload_completed: row.upload_completed,
    upload_started_at: row.upload_started_at,
    file_hash: null,
    custom_filename: row.custom_filename,
    note: row.note,
    starred: row.starred,
    folder_id: row.folder_id,
  }))
}

export async function toggleFileStarred(fileId: string, userId: string, starred: boolean): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()

  const result = await pool.query(
    `UPDATE basedrop_files SET starred = $1 WHERE id = $2 AND user_id = $3`,
    [starred, fileId, userId]
  )

  return (result.rowCount ?? 0) > 0
}

export async function getUserFileStats(userId: string): Promise<{
  totalUploads: number
  activeFiles: number
  totalDownloads: number
  storageUsed: number
}> {
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
    totalDownloads: 0,
    storageUsed: Number(row.storage_used),
  }
}

export async function deleteFileById(fileId: string, userId: string): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()

  const result = await pool.query(
    `DELETE FROM basedrop_files WHERE id = $1 AND user_id = $2`,
    [fileId, userId]
  )

  return (result.rowCount ?? 0) > 0
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
    pin: row.pin,
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

export async function getFileByIdForUpdate(fileId: string): Promise<FileRecord | null> {
  await ensureDatabase()
  const client = await getClient()

  try {
    const result = await client.query(
      `SELECT * FROM basedrop_files WHERE id = $1 FOR UPDATE`,
      [fileId]
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
      pin: row.pin,
      burn_on_read: (row.burn_on_read ?? 0) as 0 | 1 | 2,
      upload_completed: row.upload_completed,
      upload_started_at: row.upload_started_at,
      file_hash: row.file_hash,
      custom_filename: row.custom_filename,
      note: row.note,
      user_id: row.user_id,
      encryption_iv: row.encryption_iv,
      encryption_auth_tag: row.encryption_auth_tag,
      folder_id: row.folder_id,
    }
  } finally {
    client.release()
  }
}
