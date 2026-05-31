/** Minimum size to trigger multipart upload (50MB) */
export const MULTIPART_THRESHOLD = 50 * 1024 * 1024

/** Default chunk size for multipart uploads (10MB) */
export const DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024

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

// Output layout: [12-byte IV] [ciphertext + 16-byte authTag] — each chunk is self-contained
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
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.byteLength)
  return combined.buffer
}

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

export function readFileSlice(file: File, start: number, end: number): Promise<ArrayBuffer> {
  return file.slice(start, end).arrayBuffer()
}

// Returns the ETag needed for multipart completion
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

  const chunkProgress = new Float64Array(chunks.length) // bytes uploaded per chunk
  const etags: { partNumber: number; etag: string }[] = new Array(chunks.length)

  const reportProgress = () => {
    let total = 0
    for (let i = 0; i < chunkProgress.length; i++) total += chunkProgress[i]
    onProgress?.(Math.min(99, (total / totalBytes) * 100))
  }

  let nextChunkIndex = 0

  const worker = async () => {
    while (true) {
      const idx = nextChunkIndex++
      if (idx >= chunks.length) break

      const chunk = chunks[idx]
      const chunkBytes = chunk.end - chunk.start

      const plaintext = await readFileSlice(file, chunk.start, chunk.end)
      const encrypted = await encryptChunk(encryptionKey, plaintext)

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

  const workerCount = Math.min(MAX_CONCURRENT, chunks.length)
  const workers: Promise<void>[] = []
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker())
  }
  await Promise.all(workers)

  return { etags }
}

export function shouldUseMultipart(fileSize: number): boolean {
  return fileSize > MULTIPART_THRESHOLD
}

function bufferToBase64url(buffer: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i])
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

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
