import { generateEncryptionKey, uploadFileMultipart, DEFAULT_CHUNK_SIZE } from "@/lib/storage/multipart"
import { uploadWithXHR } from "./utils"
import { apiFetch, getProxyKey } from "@/lib/http/fetch"
import { API_BASE, PROXY_HEADER, STORAGE_KEY_INTERRUPTED_UPLOAD } from "@/constants"
import { isTauri } from "@/lib/tauri"
import type { FileWithPreview, InterruptedSession } from "./types"

// Per-upload metadata every init call needs beyond the file bytes themselves.
export interface UploadMeta {
  burnOnRead: boolean
  turnstileToken: string
  expirationMinutes: number
  folderId: string | null
}

interface UploadOpts {
  finalFilename: string | null
  finalNote: string | null
  filePath?: string
  finalSlug?: string | null
}

// One entry of the batched /api/v2/upload response, discriminated by `kind`.
export type BatchInitFile =
  | { kind: "simple"; fileId: string; uploadUrl: string; proxyToken: string; shareUrl: string; expiresAt: string }
  | { kind: "multipart"; fileId: string; uploadId: string; presignedUrls: string[]; totalParts: number; chunkSize: number; shareUrl: string; expiresAt: string }

async function encryptWholeFile(file: File): Promise<{ encryptedBlob: File; keyBase64: string; byteLength: number }> {
  const { key: encKey, keyBase64 } = await generateEncryptionKey()
  const plaintext = await file.arrayBuffer()
  const { encryptChunk } = await import("@/lib/storage/multipart")
  const encrypted = await encryptChunk(encKey, plaintext)
  const encryptedBlob = new File([encrypted], file.name, {
    type: file.type || "application/octet-stream",
  })
  return { encryptedBlob, keyBase64, byteLength: encrypted.byteLength }
}

// CORS fallback: stream the encrypted blob through our own proxy when a direct
// PUT to R2 is blocked by the browser.
export async function uploadViaProxy(
  file: File,
  note: string | null,
  filename: string | null,
  fileId: string,
  proxyToken: string,
  csrfToken: string,
  burnOnRead: boolean,
  onProgress: (percent: number) => void
): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("fileId", fileId)
  formData.append("proxyToken", proxyToken)
  formData.append("csrfToken", csrfToken)
  if (burnOnRead) formData.append("burnOnRead", "true")
  if (note) formData.append("note", note)
  if (filename) formData.append("customFilename", filename)

  const proxyKey = await getProxyKey()
  const xhr = await uploadWithXHR(`${API_BASE}/upload-proxy`, "POST", formData, (pct) => {
    onProgress(Math.min(90, pct))
  }, { headers: { [PROXY_HEADER]: proxyKey }, withCredentials: true })

  const response = JSON.parse(xhr.responseText)
  if (!response.success) {
    throw new Error(response.message || "Proxy upload failed")
  }
  return response.shareUrl
}

// Single-file (whole-file) upload: own init call, encrypt, PUT, complete, with a
// CORS→proxy fallback. Used for a lone file or a zipped archive.
export async function uploadSingle(
  file: File,
  csrfToken: string,
  meta: UploadMeta,
  opts: UploadOpts,
  onProgress: (pct: number) => void
): Promise<string> {
  const { encryptedBlob, keyBase64, byteLength } = await encryptWholeFile(file)

  const initResponse = await apiFetch("/api/v2/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: byteLength,
      contentType: "application/octet-stream",
      burnOnRead: meta.burnOnRead,
      turnstileToken: meta.turnstileToken,
      csrfToken,
      customFilename: opts.finalFilename,
      customSlug: opts.finalSlug,
      expiresInMinutes: meta.expirationMinutes,
      note: opts.finalNote,
      path: opts.filePath || (file as any).path,
      folderId: meta.folderId,
    }),
  })

  if (!initResponse.ok) {
    const error = await initResponse.json()
    if (initResponse.status === 409) {
      const e: any = new Error(error.message || "Custom link already taken")
      e.slugConflict = { suggestions: error.suggestions || [] }
      throw e
    }
    throw new Error(error.message || "Failed to initialize upload")
  }

  const { fileId, uploadUrl, shareUrl: url, proxyToken } = await initResponse.json()

  try {
    await uploadWithXHR(uploadUrl, "PUT", encryptedBlob, (pct) => onProgress(pct))
    onProgress(100)

    const completeResponse = await apiFetch("/api/v2/upload-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId }),
    })

    if (!completeResponse.ok) {
      const error = await completeResponse.json()
      throw new Error(error.message || "Upload validation failed")
    }

    return `${url}#${keyBase64}`
  } catch (fetchError: any) {
    const isCORSError = fetchError.message === "Failed to fetch" || fetchError.name === "TypeError"
    if (isCORSError) {
      onProgress(0)
      const proxyUrl = await uploadViaProxy(
        encryptedBlob, opts.finalNote, opts.finalFilename, fileId, proxyToken, csrfToken, meta.burnOnRead,
        (pct) => onProgress(pct)
      )
      onProgress(100)
      return `${proxyUrl}#${keyBase64}`
    }
    throw fetchError
  }
}

// Chunked multipart upload for large files: own init call, then either the Tauri
// native uploader (desktop) or the browser worker pool. Persists the session so
// an interrupted upload can be resumed; reports it via onSession.
export async function uploadMultipart(
  file: File,
  csrfToken: string,
  meta: UploadMeta,
  opts: UploadOpts,
  onProgress: (pct: number) => void,
  onSession: (s: InterruptedSession | null) => void,
  signal?: AbortSignal
): Promise<string> {
  const { key: encKey, keyBase64 } = await generateEncryptionKey()

  const initResponse = await apiFetch("/api/v2/upload-multipart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type || "application/octet-stream",
      burnOnRead: meta.burnOnRead,
      turnstileToken: meta.turnstileToken,
      csrfToken,
      customFilename: opts.finalFilename,
      customSlug: opts.finalSlug,
      expiresInMinutes: meta.expirationMinutes,
      note: opts.finalNote,
      chunkSize: DEFAULT_CHUNK_SIZE,
      path: opts.filePath || (file as any).path,
      folderId: meta.folderId,
    }),
  })

  if (!initResponse.ok) {
    const error = await initResponse.json()
    if (initResponse.status === 409) {
      const e: any = new Error(error.message || "Custom link already taken")
      e.slugConflict = { suggestions: error.suggestions || [] }
      throw e
    }
    throw new Error(error.message || "Failed to initialize multipart upload")
  }

  const { fileId, uploadId, presignedUrls, shareUrl: url } = await initResponse.json()
  const totalParts = presignedUrls.length

  const sessionInfo: InterruptedSession = {
    fileId,
    uploadId,
    r2Key: "",
    totalParts,
    chunkSize: DEFAULT_CHUNK_SIZE,
    fileName: file.name,
    fileSize: file.size,
    keyBase64,
    shareUrl: `${url}#${keyBase64}`,
  }
  onSession(sessionInfo)
  localStorage.setItem(STORAGE_KEY_INTERRUPTED_UPLOAD, JSON.stringify(sessionInfo))

  try {
    let etags: any[]

    const tauriInternals = isTauri()
    const nativeFilePath = (file as any).path as string | undefined

    if (tauriInternals && nativeFilePath) {
      const { invoke } = await import("@tauri-apps/api/core")
      const { listen } = await import("@tauri-apps/api/event")

      const unlisten = await listen<{
        percent: number
        bytes_uploaded: number
        total_bytes: number
        phase: string
        parts_done: number
        total_parts: number
      }>("upload-progress", (event) => {
        onProgress(Math.min(95, event.payload.percent))
      })

      try {
        etags = await invoke<string[]>("native_upload_multipart", {
          filePath: nativeFilePath,
          presignedUrls,
          keyBase64,
          chunkSize: DEFAULT_CHUNK_SIZE,
        })
      } finally {
        unlisten()
      }
    } else {
      const result = await uploadFileMultipart({
        file,
        encryptionKey: encKey,
        presignedUrls,
        chunkSize: DEFAULT_CHUNK_SIZE,
        onProgress: (pct) => onProgress(Math.min(95, pct)),
        signal,
      })
      etags = result.etags
    }

    const completeResponse = await apiFetch("/api/v2/upload-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId, uploadId, parts: etags }),
    })

    if (!completeResponse.ok) {
      const error = await completeResponse.json()
      throw new Error(error.message || "Multipart upload finalization failed")
    }

    onProgress(100)
    onSession(null)
    return `${url}#${keyBase64}`
  } catch (uploadError: any) {
    if (uploadError.message === "Upload aborted") {
      throw uploadError
    }
    console.error("[Upload] Multipart upload interrupted:", uploadError.message)
    throw uploadError
  }
}

// Init the whole multi-file upload in ONE call so a single solved Turnstile
// token verifies the batch (instead of once per file, which hit the reuse cap).
export async function initBatchUpload(
  files: FileWithPreview[],
  csrfToken: string,
  meta: UploadMeta,
  opts: { finalFilename: string | null; finalNote: string | null }
): Promise<BatchInitFile[]> {
  const initResponse = await apiFetch("/api/v2/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      files: files.map((f) => ({
        fileName: f.file.name,
        fileSize: f.file.size,
        contentType: f.file.type || "application/octet-stream",
        path: f.path || (f.file as any).path || f.file.name,
      })),
      burnOnRead: meta.burnOnRead,
      turnstileToken: meta.turnstileToken,
      csrfToken,
      customFilename: opts.finalFilename,
      expiresInMinutes: meta.expirationMinutes,
      note: opts.finalNote,
      folderId: meta.folderId,
    }),
  })

  if (!initResponse.ok) {
    const error = await initResponse.json()
    throw new Error(error.message || "Failed to initialize upload")
  }

  const { files: initResults } = await initResponse.json()
  return initResults as BatchInitFile[]
}

// Per-file sender for a batched simple upload (init already fetched).
export async function uploadBatchSimple(
  file: File,
  init: Extract<BatchInitFile, { kind: "simple" }>,
  csrfToken: string,
  opts: { finalFilename: string | null; finalNote: string | null; burnOnRead: boolean },
  onProgress: (pct: number) => void
): Promise<string> {
  const { encryptedBlob, keyBase64 } = await encryptWholeFile(file)

  try {
    await uploadWithXHR(init.uploadUrl, "PUT", encryptedBlob, (pct) => onProgress(pct))
    onProgress(100)
    const completeResponse = await apiFetch("/api/v2/upload-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId: init.fileId }),
    })
    if (!completeResponse.ok) {
      const error = await completeResponse.json()
      throw new Error(error.message || "Upload validation failed")
    }
    return `${init.shareUrl}#${keyBase64}`
  } catch (fetchError: any) {
    const isCORSError = fetchError.message === "Failed to fetch" || fetchError.name === "TypeError"
    if (isCORSError) {
      onProgress(0)
      const proxyUrl = await uploadViaProxy(
        encryptedBlob, opts.finalNote, opts.finalFilename, init.fileId, init.proxyToken, csrfToken, opts.burnOnRead,
        (pct) => onProgress(pct)
      )
      onProgress(100)
      return `${proxyUrl}#${keyBase64}`
    }
    throw fetchError
  }
}

// Per-file sender for a batched multipart upload (init already fetched).
export async function uploadBatchMultipart(
  file: File,
  init: Extract<BatchInitFile, { kind: "multipart" }>,
  onProgress: (pct: number) => void,
  signal?: AbortSignal
): Promise<string> {
  const { key: encKey, keyBase64 } = await generateEncryptionKey()
  const { etags } = await uploadFileMultipart({
    file,
    encryptionKey: encKey,
    presignedUrls: init.presignedUrls,
    chunkSize: init.chunkSize,
    onProgress: (pct) => onProgress(Math.min(95, pct)),
    signal,
  })
  const completeResponse = await apiFetch("/api/v2/upload-complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId: init.fileId, uploadId: init.uploadId, parts: etags }),
  })
  if (!completeResponse.ok) {
    const error = await completeResponse.json()
    throw new Error(error.message || "Multipart upload finalization failed")
  }
  onProgress(100)
  return `${init.shareUrl}#${keyBase64}`
}
