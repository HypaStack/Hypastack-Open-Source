import { decryptChunk } from "@/lib/storage/multipart"
import { decryptE2E } from "@/lib/security/cryptoClient"
import { unwrapFunnelPrivateKey, unwrapAesKey } from "@/lib/security/funnelCrypto"

// Per-chunk AES-GCM overhead: 12-byte IV + 16-byte tag (see encryptChunk).
const CHUNK_OVERHEAD = 28

// Recover a received file's AES key: master key → funnel private key → AES key.
export async function unwrapFunnelFileKey(
  wrappedPrivateKey: string,
  wrappedKey: string,
  masterKey: CryptoKey,
): Promise<CryptoKey> {
  const privateKey = await unwrapFunnelPrivateKey(wrappedPrivateKey, masterKey)
  return unwrapAesKey(wrappedKey, privateKey)
}

export function decryptFunnelName(nameEncrypted: string, aesKey: CryptoKey): Promise<string> {
  return decryptE2E(nameEncrypted, aesKey)
}

// Fetch the ciphertext from the presigned URL and decrypt it in-browser, then
// trigger a save. Mirrors the multipart split used by the download page:
// concatenated encrypted chunks of (chunkSize + 28) bytes, last one shorter.
export async function downloadAndDecryptFunnelFile(opts: {
  url: string
  aesKey: CryptoKey
  fileName: string
  contentType: string
  chunkSize: number | null
  totalParts: number | null
}): Promise<void> {
  const res = await fetch(opts.url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const encData = await res.arrayBuffer()

  const isMultipart = opts.totalParts !== null && opts.totalParts > 1 && opts.chunkSize !== null
  const parts: ArrayBuffer[] = []

  if (isMultipart) {
    const encChunk = opts.chunkSize! + CHUNK_OVERHEAD
    let off = 0
    while (off < encData.byteLength) {
      const size = Math.min(encChunk, encData.byteLength - off)
      parts.push(await decryptChunk(opts.aesKey, encData.slice(off, off + size)))
      off += size
    }
  } else {
    parts.push(await decryptChunk(opts.aesKey, encData))
  }

  const total = parts.reduce((sum, p) => sum + p.byteLength, 0)
  const buf = new Uint8Array(total)
  let written = 0
  for (const p of parts) {
    buf.set(new Uint8Array(p), written)
    written += p.byteLength
  }

  const blob = new Blob([buf], { type: opts.contentType || "application/octet-stream" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = opts.fileName
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
