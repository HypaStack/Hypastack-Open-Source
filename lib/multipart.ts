/**
 * Client-side multipart upload with AES-256-GCM encryption.
 *
 * DATA ARCHITECTURE (from skill file):
 * - 100% of encryption and chunking happens in the USER'S RAM
 * - Frontend encrypts chunks in the browser (Web Crypto API)
 * - Frontend pipes encrypted chunks DIRECTLY to Cloudflare R2
 * - Origin server only handles metadata and URL signing (<31ms target)
 *
 * Files >50MB use multipart uploads with presigned URLs per chunk.
 * Files <=50MB use a single presigned PUT (existing flow).
 */

/** Minimum size to trigger multipart upload (50MB) */
export const MULTIPART_THRESHOLD = 50 * 1024 * 1024

/** Default chunk size for multipart uploads (10MB) */
export const DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024

/**
 * Generate a random AES-256-GCM key in the browser.
 * Returns the CryptoKey and its raw bytes encoded as base64url.
 */
export async function generateEncryptionKey(): Promise<{
  key: CryptoKey
  keyBase64: string
}> {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  )
  const raw = await crypto.subtle.exportKey("raw", key)
  const keyBase64 = bufferToBase64url(new Uint8Array(raw))
  return { key, keyBase64 }
}

/**
 * Encrypt a single chunk with AES-256-GCM.
 * Returns: iv (12 bytes) || ciphertext || authTag (16 bytes)
 * The IV is prepended so each chunk is self-contained.
 */
export async function encryptChunk(
  key: CryptoKey,
  plaintext: ArrayBuffer
): Promise<ArrayBuffer> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    key,
    plaintext
  )
  // Combine: [12-byte IV] [ciphertext + 16-byte authTag]
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.byteLength)
  return combined.buffer
}

/**
 * Decrypt a single chunk (reverses encryptChunk).
 */
export async function decryptChunk(
  key: CryptoKey,
  data: ArrayBuffer
): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(data)
  const iv = bytes.slice(0, 12)
  const ciphertext = bytes.slice(12)
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    key,
    ciphertext
  )
}

/**
 * Split a file into chunks and return ArrayBuffer slices.
 */
export function* chunkFile(
  file: File,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): Generator<{ index: number; start: number; end: number; total: number }> {
  const total = Math.ceil(file.size / chunkSize)
  for (let i = 0; i < total; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    yield { index: i, start, end, total }
  }
}

/**
 * Read a slice of a File as an ArrayBuffer.
 */
export function readFileSlice(file: File, start: number, end: number): Promise<ArrayBuffer> {
  return file.slice(start, end).arrayBuffer()
}

/**
 * Upload a single chunk to a presigned URL via PUT.
 * Returns the ETag from the response headers (needed for multipart completion).
 */
export async function uploadChunkToR2(
  presignedUrl: string,
  data: ArrayBuffer,
  onProgress?: (loaded: number, total: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) onProgress(e.loaded, e.total)
      })
    }
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag") || ""
        resolve(etag.replace(/"/g, ""))
      } else {
        reject(new Error(`Chunk upload failed: HTTP ${xhr.status}`))
      }
    })
    xhr.addEventListener("error", () => reject(new Error("Chunk upload network error")))
    xhr.addEventListener("abort", () => reject(new Error("Chunk upload aborted")))
    xhr.open("PUT", presignedUrl)
    xhr.send(data)
  })
}

/**
 * Full multipart upload flow with PARALLEL chunk uploads:
 * 1. Chunk the file
 * 2. Encrypt each chunk with AES-256-GCM (Web Crypto)
 * 3. Upload encrypted chunks to R2 via presigned URLs — up to MAX_CONCURRENT at once
 * 4. Return ETags (ordered by part number) for server-side multipart completion
 *
 * Parallel uploads saturate the user's bandwidth for maximum throughput.
 */
const MAX_CONCURRENT = 10

export async function uploadFileMultipart(opts: {
  file: File
  encryptionKey: CryptoKey
  presignedUrls: string[]
  chunkSize?: number
  onProgress?: (percent: number) => void
}): Promise<{ etags: { partNumber: number; etag: string }[] }> {
  const { file, encryptionKey, presignedUrls, chunkSize = DEFAULT_CHUNK_SIZE, onProgress } = opts
  const chunks = [...chunkFile(file, chunkSize)]
  const totalBytes = file.size

  // Per-chunk progress tracking for accurate aggregate progress
  const chunkProgress = new Float64Array(chunks.length) // bytes uploaded per chunk
  const etags: { partNumber: number; etag: string }[] = new Array(chunks.length)

  const reportProgress = () => {
    let total = 0
    for (let i = 0; i < chunkProgress.length; i++) total += chunkProgress[i]
    onProgress?.(Math.min(99, (total / totalBytes) * 100))
  }

  // Worker pool: process chunks in parallel
  let nextChunkIndex = 0

  const worker = async () => {
    while (true) {
      const idx = nextChunkIndex++
      if (idx >= chunks.length) break

      const chunk = chunks[idx]
      const chunkBytes = chunk.end - chunk.start

      // Read chunk from file
      const plaintext = await readFileSlice(file, chunk.start, chunk.end)

      // Encrypt in browser RAM
      const encrypted = await encryptChunk(encryptionKey, plaintext)

      // Upload encrypted chunk directly to R2
      const partNumber = chunk.index + 1
      const etag = await uploadChunkToR2(
        presignedUrls[chunk.index],
        encrypted,
        (loaded, total) => {
          chunkProgress[idx] = (loaded / total) * chunkBytes
          reportProgress()
        }
      )

      etags[idx] = { partNumber, etag }
      chunkProgress[idx] = chunkBytes
      reportProgress()
    }
  }

  // Spawn workers (capped at chunk count)
  const workerCount = Math.min(MAX_CONCURRENT, chunks.length)
  const workers: Promise<void>[] = []
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker())
  }
  await Promise.all(workers)

  return { etags }
}

/**
 * Determine whether a file should use multipart upload.
 */
export function shouldUseMultipart(fileSize: number): boolean {
  return fileSize > MULTIPART_THRESHOLD
}

// Utility: ArrayBuffer to base64url
function bufferToBase64url(buffer: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i])
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

// Utility: base64url to CryptoKey
export async function importKeyFromBase64(keyBase64: string): Promise<CryptoKey> {
  const binary = atob(keyBase64.replace(/-/g, "+").replace(/_/g, "/"))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return crypto.subtle.importKey(
    "raw",
    bytes,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}
