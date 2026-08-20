import { getPool, getClient, ensureDatabase } from '@/lib/data/db'
import { cached, bustCache } from '@/lib/data/cache'
import crypto from 'crypto'

export interface FileRequest {
  id: string
  slug: string
  user_id: string
  public_key: string
  private_key_wrapped: string
  status: 'active' | 'consumed'
  created_at: Date
  consumed_at: Date | null
}

export interface CreateRequestInput {
  id: string
  slug: string
  user_id: string
  public_key: string
  private_key_wrapped: string
}

// A received file joined with the crypto material its owner needs to decrypt it:
// the fileRequest's wrapped private key (unwraps with the master key) plus this file's
// wrapped AES key (unwraps with the private key).
export interface RequestFile {
  id: string
  funnel_id: string
  r2_key: string
  name_encrypted: string
  file_size: number
  content_type: string
  wrapped_key: string
  private_key_wrapped: string
  encryption_chunk_size: number | null
  encryption_total_parts: number | null
  created_at: Date
}

export interface CreateRequestFileInput {
  id: string
  funnel_id: string
  user_id: string
  r2_key: string
  name_encrypted: string
  file_size: number
  content_type: string
  wrapped_key: string
  encryption_chunk_size?: number | null
  encryption_total_parts?: number | null
}

function generateId12(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 12; i++) result += chars.charAt(crypto.randomInt(0, chars.length))
  return result
}

export const generateRequestId = generateId12
export const generateRequestFileId = generateId12

// R2 object key for a fileRequest drop's ciphertext. The name is opaque, the real
// filename is E2E-encrypted and stored separately. Init and complete both derive
// the key from these ids so a sender can't redirect the write elsewhere.
export function requestObjectKey(requestId: string, fileId: string): string {
  return `funnels/${requestId}/${fileId}`
}

// Per-user advisory lock serializes concurrent creates so count-then-insert can't
// race past the cap. Slug conflicts still surface as a 23505 for the caller.
export async function createRequestWithCap(input: CreateRequestInput, maxActive: number): Promise<'ok' | 'cap'> {
  await ensureDatabase()
  const client = await getClient()
  try {
    await client.query('BEGIN')
    // 9631 namespaces this lock apart from any other advisory locks in the app.
    await client.query(`SELECT pg_advisory_xact_lock(9631, hashtext($1))`, [input.user_id])
    const c = await client.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM funnels WHERE user_id = $1 AND status = 'active'`,
      [input.user_id]
    )
    if ((c.rows[0]?.n ?? 0) >= maxActive) {
      await client.query('ROLLBACK')
      return 'cap'
    }
    await client.query(
      `INSERT INTO funnels (id, slug, user_id, public_key, private_key_wrapped)
       VALUES ($1, $2, $3, $4, $5)`,
      [input.id, input.slug, input.user_id, input.public_key, input.private_key_wrapped]
    )
    await client.query('COMMIT')
    await bustCache(`user:${input.user_id}:funnels`)
    return 'ok'
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    client.release()
  }
}

// In-flight drop tracking: a row is written at init and cleared on complete, so
// an abandoned upload's R2 object can be swept later (see hypasched_periodic /
// lib/cleanup). Mirrors upload_staging.
export async function createRequestStaging(id: string, requestId: string, r2Key: string): Promise<void> {
  await ensureDatabase()
  const pool = getPool()
  await pool.query(
    `INSERT INTO funnel_staging (id, funnel_id, r2_key) VALUES ($1, $2, $3)`,
    [id, requestId, r2Key]
  )
}

export async function deleteRequestStaging(id: string): Promise<void> {
  await ensureDatabase()
  const pool = getPool()
  await pool.query(`DELETE FROM funnel_staging WHERE id = $1`, [id])
}

// The slug is the public path segment (`/requests/<slug>`), so it must be unique
// across funnels. The `id = $1` clause guards against a slug colliding with a
// random fileRequest id.
export async function isRequestSlugTaken(slug: string): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(
    `SELECT 1 FROM funnels WHERE slug = $1 OR id = $1 LIMIT 1`,
    [slug]
  )
  return result.rows.length > 0
}

export async function suggestAvailableRequestSlugs(base: string, max = 3): Promise<string[]> {
  const { generateSlugCandidates } = await import('@/lib/validation/slug')
  const candidates = generateSlugCandidates(base)
  const available: string[] = []
  for (const candidate of candidates) {
    if (available.length >= max) break
    if (!(await isRequestSlugTaken(candidate))) available.push(candidate)
  }
  return available
}

// Public sender flow: only an active (unconsumed) fileRequest is drop-able.
export async function getActiveRequestBySlug(slug: string): Promise<FileRequest | null> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(
    `SELECT * FROM funnels WHERE slug = $1 AND status = 'active'`,
    [slug]
  )
  if (result.rows.length === 0) return null
  return result.rows[0] as FileRequest
}

export async function getRequestsByUserId(userId: string): Promise<FileRequest[]> {
  return cached(`user:${userId}:funnels`, 60, async () => {
    await ensureDatabase()
    const pool = getPool()
    const result = await pool.query(
      `SELECT * FROM funnels WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    )
    return result.rows as FileRequest[]
  })
}

// Atomically claim an active fileRequest: flips it to consumed and returns the row.
// A second concurrent drop on the same link gets null (the link is one-time).
export async function consumeRequest(id: string): Promise<FileRequest | null> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(
    `UPDATE funnels SET status = 'consumed', consumed_at = NOW()
     WHERE id = $1 AND status = 'active' RETURNING *`,
    [id]
  )
  if (result.rows.length === 0) return null
  const fileRequest = result.rows[0] as FileRequest
  await bustCache(`user:${fileRequest.user_id}:funnels`)
  return fileRequest
}

// Delete an unused (active) drop link. Consumed funnels are removed with their
// received file instead (see deleteRequestFile), so this is scoped to active rows.
export async function deleteActiveRequestBySlug(slug: string, userId: string): Promise<boolean> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(
    `DELETE FROM funnels WHERE slug = $1 AND user_id = $2 AND status = 'active'`,
    [slug, userId]
  )
  await bustCache(`user:${userId}:funnels`)
  return (result.rowCount ?? 0) > 0
}

export async function createRequestFile(input: CreateRequestFileInput): Promise<void> {
  await ensureDatabase()
  const pool = getPool()
  await pool.query(
    `INSERT INTO funnel_files
       (id, funnel_id, user_id, r2_key, name_encrypted, file_size, content_type, wrapped_key, encryption_chunk_size, encryption_total_parts)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      input.id, input.funnel_id, input.user_id, input.r2_key, input.name_encrypted,
      input.file_size, input.content_type, input.wrapped_key,
      input.encryption_chunk_size ?? null, input.encryption_total_parts ?? null,
    ]
  )
  await bustCache(`user:${input.user_id}:fileRequest-files`, `user:${input.user_id}:storage`)
}

export async function getRequestFilesByUserId(userId: string): Promise<RequestFile[]> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query(
    `SELECT f.id, f.funnel_id, f.r2_key, f.name_encrypted, f.file_size, f.content_type,
            f.wrapped_key, f.encryption_chunk_size, f.encryption_total_parts, f.created_at,
            fn.private_key_wrapped
       FROM funnel_files f
       JOIN funnels fn ON fn.id = f.funnel_id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC`,
    [userId]
  )
  return result.rows.map(row => ({
    id: row.id,
    funnel_id: row.funnel_id,
    r2_key: row.r2_key,
    name_encrypted: row.name_encrypted,
    file_size: Number(row.file_size),
    content_type: row.content_type,
    wrapped_key: row.wrapped_key,
    private_key_wrapped: row.private_key_wrapped,
    encryption_chunk_size: row.encryption_chunk_size,
    encryption_total_parts: row.encryption_total_parts,
    created_at: row.created_at,
  }))
}

// Delete a received file and its parent fileRequest (the keypair is no longer needed
// once the file is gone). Returns the r2_key for R2 cleanup, or null if not
// owned/found.
export async function deleteRequestFile(id: string, userId: string): Promise<string | null> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query<{ r2_key: string; funnel_id: string }>(
    `DELETE FROM funnel_files WHERE id = $1 AND user_id = $2 RETURNING r2_key, funnel_id`,
    [id, userId]
  )
  if (result.rows.length === 0) return null
  await pool.query(`DELETE FROM funnels WHERE id = $1 AND user_id = $2`, [result.rows[0].funnel_id, userId])
  await bustCache(`user:${userId}:funnels`, `user:${userId}:fileRequest-files`, `user:${userId}:storage`)
  return result.rows[0].r2_key
}

// Owner-scoped fetch of a single received file (for the authenticated download URL).
export async function getRequestFileForOwner(id: string, userId: string): Promise<{ r2_key: string; content_type: string } | null> {
  await ensureDatabase()
  const pool = getPool()
  const result = await pool.query<{ r2_key: string; content_type: string }>(
    `SELECT r2_key, content_type FROM funnel_files WHERE id = $1 AND user_id = $2`,
    [id, userId]
  )
  return result.rows[0] ?? null
}
