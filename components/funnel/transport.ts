import {
  generateEncryptionKey,
  encryptChunk,
  uploadFileMultipart,
  DEFAULT_CHUNK_SIZE,
  MULTIPART_THRESHOLD,
} from "@/lib/storage/multipart"
import { encryptE2E } from "@/lib/security/cryptoClient"
import { importFunnelPublicKey, wrapAesKey } from "@/lib/security/funnelCrypto"
import { apiFetch } from "@/lib/http/fetch"

export type DropState = "encrypting" | "uploading" | "done" | "error"

interface InitSimple { kind: "simple"; fileId: string; uploadUrl: string }
interface InitMultipart {
  kind: "multipart"
  fileId: string
  uploadId: string
  presignedUrls: string[]
  chunkSize: number
  totalParts: number
}

// Drop a single file into a funnel: generate a random AES key, encrypt the file
// (and its name) with it, RSA-wrap the AES key with the funnel's public key, and
// hand the ciphertext + wrapped key to the server. Mirrors the authed upload
// transport but swaps the URL-fragment key for a public-key wrap.
export async function dropFile(opts: {
  slug: string
  file: File
  publicKeySpki: string
  csrfToken: string
  turnstileToken: string
  onState?: (s: DropState) => void
}): Promise<void> {
  const { slug, file, publicKeySpki, csrfToken, turnstileToken, onState } = opts

  onState?.("encrypting")

  const publicKey = await importFunnelPublicKey(publicKeySpki)
  const { key: aesKey } = await generateEncryptionKey()
  const rawAesKey = await crypto.subtle.exportKey("raw", aesKey)
  const wrappedKey = await wrapAesKey(rawAesKey, publicKey)
  const nameEncrypted = await encryptE2E(file.name, aesKey)

  const init = await initUpload(slug, file, csrfToken, turnstileToken)

  onState?.("uploading")

  const completeBody: Record<string, unknown> = {
    fileId: init.fileId,
    nameEncrypted,
    wrappedKey,
    contentType: file.type || "application/octet-stream",
  }

  if (init.kind === "multipart") {
    const { etags } = await uploadFileMultipart({
      file,
      encryptionKey: aesKey,
      presignedUrls: init.presignedUrls,
      chunkSize: init.chunkSize,
    })
    completeBody.uploadId = init.uploadId
    completeBody.parts = etags
    completeBody.chunkSize = init.chunkSize
    completeBody.totalParts = init.totalParts
  } else {
    const plaintext = await file.arrayBuffer()
    const encrypted = await encryptChunk(aesKey, plaintext)
    const putRes = await fetch(init.uploadUrl, {
      method: "PUT",
      body: encrypted,
      headers: { "Content-Type": "application/octet-stream" },
    })
    if (!putRes.ok) throw new Error("Upload failed")
  }

  const completeRes = await apiFetch(`/api/v2/funnel/${slug}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(completeBody),
  })
  if (!completeRes.ok) {
    const err = await completeRes.json().catch(() => ({}))
    throw new Error(err.message || "Couldn't finish the drop")
  }

  onState?.("done")
}

async function initUpload(
  slug: string,
  file: File,
  csrfToken: string,
  turnstileToken: string,
): Promise<InitSimple | InitMultipart> {
  const res = await apiFetch(`/api/v2/funnel/${slug}/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileSize: file.size,
      contentType: file.type || "application/octet-stream",
      csrfToken,
      turnstileToken,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || "Couldn't start the upload")
  }
  return res.json()
}

export { MULTIPART_THRESHOLD }
