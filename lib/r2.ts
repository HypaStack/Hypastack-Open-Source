/**
 * R2 operations using AWS SDK for JavaScript
 * 
 * SSL ALERT 40 FIXES FOR OPENSSL 3.x (Linux & Windows):
 * 1. Explicit SNI (servername) in https.Agent
 * 2. Modern cipher suites only (OpenSSL 3.x compatible)
 * 3. Force IPv4 to avoid IPv6 certificate mismatch
 * 4. ECDH curve auto-negotiation
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, HeadObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { NodeHttpHandler } from "@smithy/node-http-handler"
import https from 'https'
import crypto from "crypto"

// ============================================================================
// Configuration & Client Setup
// ============================================================================

function getEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value.trim()
}

export function getEndpoint(): string {
  const accountId = getEnvVar("R2_ACCOUNT_ID").replace(/^https?:\/\//, '')
  const jurisdiction = process.env.R2_JURISDICTION?.trim().toLowerCase()
  
  if (jurisdiction && jurisdiction !== 'global') {
    return `${accountId}.${jurisdiction}.r2.cloudflarestorage.com`
  }
  
  return `${accountId}.r2.cloudflarestorage.com`
}

/**
 * Create HTTPS agent with OpenSSL 3.x compatibility
 * 
 * CRITICAL FIXES:
 * - servername: REQUIRED for SNI with Cloudflare
 * - ciphers: Only modern ciphers (OpenSSL 3.x compatible, no legacy)
 * - family: 4: Force IPv4 (avoids IPv6 cert mismatch)
 * - minVersion: TLS 1.2 (OpenSSL 3.x default is fine, but explicit is safer)
 */
function createHttpsAgent(): https.Agent {
  const host = getEndpoint()
  
  // OpenSSL 3.x compatible cipher suites
  // Using ONLY modern ciphers that are in OpenSSL 3.x default provider
  // (NO legacy ciphers that require --openssl-legacy-provider)
  const modernCiphers = [
    'TLS_AES_128_GCM_SHA256',
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305',
  ].join(':')
  
  return new https.Agent({
    keepAlive: true,
    minVersion: 'TLSv1.2',
    // CRITICAL: Explicit SNI for Cloudflare
    servername: host,
    // CRITICAL: Only modern ciphers (OpenSSL 3.x compatible)
    ciphers: modernCiphers,
    // CRITICAL: Force IPv4 to avoid IPv6 cert mismatch
    family: 4,
    // ECDH auto for curve negotiation
    ecdhCurve: 'auto',
  })
}

function createR2Client(): S3Client {
  const accessKeyId = getEnvVar("R2_ACCESS_KEY_ID")
  const secretAccessKey = getEnvVar("R2_SECRET_ACCESS_KEY")
  const endpoint = getEndpoint()
  
  console.log("[R2] Initializing client with endpoint:", endpoint)
  console.log("[R2] Node.js version:", process.version)
  console.log("[R2] OpenSSL version:", process.versions.openssl)
  
  const httpsAgent = createHttpsAgent()
  
  const requestHandler = new NodeHttpHandler({
    httpsAgent,
    requestTimeout: 30000,
    connectionTimeout: 10000,
  })
  
  return new S3Client({
    region: "auto",
    endpoint: `https://${endpoint}`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
    requestHandler,
  })
}

let _r2Client: S3Client | null = null
export function getR2Client(): S3Client {
  if (!_r2Client) {
    _r2Client = createR2Client()
  }
  return _r2Client
}

export { getEndpoint as getR2Endpoint }

export function getBucketName(): string {
  return getEnvVar("R2_BUCKET_NAME")
}

// ============================================================================
// Utility Functions
// ============================================================================

export function generateFileId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  const randomBytes = crypto.randomBytes(8)
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(randomBytes[i] % chars.length)
  }
  return result
}

export function getExpirationDate(fileSize: number, multiplier: number = 1): Date {
  const now = new Date()
  const mb = fileSize / (1024 * 1024)
  const day = 24 * 60 * 60 * 1000

  let baseDays: number
  if (mb < 25) baseDays = 7
  else if (mb < 50) baseDays = 5
  else if (mb < 100) baseDays = 3
  else baseDays = 1

  return new Date(now.getTime() + baseDays * multiplier * day)
}

export function getDaysUntilExpiration(expiresAt: Date): number {
  const now = new Date()
  const diff = expiresAt.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ============================================================================
// URL Generation
// ============================================================================

export async function getPresignedUploadUrl(fileId: string, fileName: string, contentType?: string): Promise<string> {
  const bucketName = getBucketName()
  const key = `uploads/${fileId}/${fileName}`

  console.log("[R2] Generating upload URL for:", key)

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ...(contentType ? { ContentType: contentType } : {}),
  })

  const url = await getSignedUrl(getR2Client(), command, { expiresIn: 3600 })
  return url
}

/**
 * Presigned PUT URL for direct browser-to-R2 CDN uploads. Key uses the
 * `cdn/<cdnId>/<filename>` layout that's already publicly served by
 * the R2 custom domain, so once the PUT succeeds the file is immediately
 * reachable via the CDN without any origin server involvement.
 */
export async function getPresignedCdnUploadUrl(
  cdnId: string,
  fileName: string,
  contentType: string,
): Promise<{ uploadUrl: string; r2Key: string }> {
  const r2Key = `cdn/${cdnId}/${fileName}`

  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: r2Key,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  })

  const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 3600 })
  return { uploadUrl, r2Key }
}

/**
 * HEAD a CDN object to confirm it actually exists in R2 (with what size).
 * Used by the upload-complete handler to prevent clients from registering
 * fake DB rows for objects they never actually PUT.
 */
export async function headCdnObject(r2Key: string): Promise<{ size: number; contentType: string } | null> {
  try {
    const response = await getR2Client().send(
      new HeadObjectCommand({
        Bucket: getBucketName(),
        Key: r2Key,
      }),
    )
    return {
      size: response.ContentLength ?? 0,
      contentType: response.ContentType ?? "application/octet-stream",
    }
  } catch {
    return null
  }
}

/**
 * RFC 6266 / 5987 Content-Disposition with ASCII fallback + UTF-8 encoded filename*.
 * Strips control chars and quote-breakers from the ASCII fallback so the header
 * stays well-formed even for filenames containing non-ASCII or special chars.
 */
export function buildContentDisposition(originalName: string): string {
  const ascii = originalName
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\]/g, '_')
  const encoded = encodeURIComponent(originalName)
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`
}

/**
 * Issue a presigned R2 GET URL that the browser can hit directly.
 * R2 will echo back ResponseContentDisposition / ResponseContentType so the
 * download saves with the original filename and correct MIME without the
 * origin server ever touching the bytes.
 */
export async function getPresignedDownloadUrl(opts: {
  r2Key: string
  originalName: string
  contentType: string
  expiresIn?: number
  disposition?: "attachment" | "inline"
}): Promise<string> {
  const disposition = opts.disposition ?? "attachment"
  const ascii = opts.originalName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_')
  const encoded = encodeURIComponent(opts.originalName)
  const contentDisposition =
    disposition === "inline"
      ? `inline; filename="${ascii}"; filename*=UTF-8''${encoded}`
      : buildContentDisposition(opts.originalName)

  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: opts.r2Key,
    ResponseContentDisposition: contentDisposition,
    ResponseContentType: opts.contentType,
  })

  return getSignedUrl(getR2Client(), command, { expiresIn: opts.expiresIn ?? 300 })
}

// ============================================================================
// Server-Side Operations
// ============================================================================

export async function uploadFileBuffer(
  fileId: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<void> {
  const bucketName = getBucketName()
  const key = `uploads/${fileId}/${fileName}`
  
  console.log("[R2] Uploading buffer:", key, "Size:", fileBuffer.length)
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  })

  await getR2Client().send(command)
  console.log("[R2] Upload successful:", key)
}

/** Upload a buffer to an exact R2 key (no path prefix added) */
export async function putObjectByKey(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    Body: body,
    ContentType: contentType,
  })
  await getR2Client().send(command)
  console.log("[R2] putObjectByKey successful:", key)
}

export async function deleteFileFromR2(fileId: string, fileName: string): Promise<void> {
  const bucketName = getBucketName()
  const key = `uploads/${fileId}/${fileName}`
  
  console.log("[R2] Deleting:", key)
  
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  await getR2Client().send(command)
  console.log("[R2] Delete successful:", key)
}

export async function fileExists(fileId: string, fileName: string): Promise<boolean> {
  const bucketName = getBucketName()
  const key = `uploads/${fileId}/${fileName}`
  
  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
    await getR2Client().send(command)
    return true
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false
    }
    throw error
  }
}

// Download first N bytes for magic bytes validation
export async function downloadFileHead(fileId: string, fileName: string, bytes: number = 65536): Promise<Buffer> {
  const bucketName = getBucketName()
  const key = `uploads/${fileId}/${fileName}`
  
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
    Range: `bytes=0-${bytes - 1}`,
  })
  
  const response = await getR2Client().send(command)
  
  if (!response.Body) {
    throw new Error('Empty response body')
  }
  
  // Convert stream to buffer
  const chunks: Buffer[] = []
  for await (const chunk of response.Body as any) {
    chunks.push(Buffer.from(chunk))
  }
  
  return Buffer.concat(chunks)
}

// ============================================================================
// r2Key-based operations (for UUID-named files)
// ============================================================================

/** Check if an object exists by its full r2Key */
export async function fileExistsByKey(r2Key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({ Bucket: getBucketName(), Key: r2Key })
    await getR2Client().send(command)
    return true
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) return false
    throw error
  }
}

/** Delete an object by its full r2Key */
export async function deleteByKey(r2Key: string): Promise<void> {
  console.log("[R2] Deleting by key:", r2Key)
  const command = new DeleteObjectCommand({ Bucket: getBucketName(), Key: r2Key })
  await getR2Client().send(command)
}

/**
 * Batch-delete up to 1000 R2 objects in a single HTTP call.
 * Cloudflare R2 supports the S3 DeleteObjects API (max 1000 keys per request).
 * Automatically chunks larger arrays into sequential batches of 1000.
 * Returns the list of keys that failed to delete (empty array = full success).
 */
export async function deleteObjectsBatch(r2Keys: string[]): Promise<string[]> {
  if (r2Keys.length === 0) return []

  const BATCH_SIZE = 1000
  const failedKeys: string[] = []
  const bucket = getBucketName()
  const client = getR2Client()

  for (let i = 0; i < r2Keys.length; i += BATCH_SIZE) {
    const chunk = r2Keys.slice(i, i + BATCH_SIZE)
    console.log(`[R2] Batch deleting ${chunk.length} objects (chunk ${Math.floor(i / BATCH_SIZE) + 1})`)

    const command = new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: chunk.map(Key => ({ Key })),
        Quiet: false,
      },
    })

    const response = await client.send(command)

    if (response.Errors && response.Errors.length > 0) {
      for (const err of response.Errors) {
        console.error(`[R2] Batch delete error for key "${err.Key}": ${err.Code} - ${err.Message}`)
        if (err.Key) failedKeys.push(err.Key)
      }
    }

    console.log(`[R2] Batch deleted ${(response.Deleted ?? []).length} objects successfully`)
  }

  return failedKeys
}

/** Download first N bytes by full r2Key */
export async function downloadHeadByKey(r2Key: string, bytes: number = 65536): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: r2Key,
    Range: `bytes=0-${bytes - 1}`,
  })
  const response = await getR2Client().send(command)
  if (!response.Body) throw new Error('Empty response body')
  const chunks: Buffer[] = []
  for await (const chunk of response.Body as any) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

/** Generate a presigned PUT URL for a specific r2Key */
export async function getPresignedUploadUrlByKey(r2Key: string, contentType?: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: r2Key,
    ...(contentType ? { ContentType: contentType } : {}),
  })
  return getSignedUrl(getR2Client(), command, { expiresIn: 3600 })
}

