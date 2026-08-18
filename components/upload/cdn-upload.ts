import { apiFetch } from "@/lib/http/fetch"
import {
  IMMUTABLE_CACHE_CONTROL,
  CDN_CONCURRENCY_SMALL_MAX,
  CDN_CONCURRENCY_MEDIUM_MAX,
  CDN_CONCURRENCY_MEDIUM_CAP,
} from "@/constants/upload"
import type { FileWithPreview, SlugConflictError } from "./types"
import type { CdnAssetItem } from "@/hooks/useManage"

interface CdnUploadDeps {
  turnstileToken: string
  folderId: string | null
  customSlug: string
  /** Upper bound on simultaneous PUTs, from the account's tier. */
  concurrency: number
  onFileIndex: (i: number) => void
  onProgress: (pct: number) => void
  onUploadComplete?: (asset: CdnAssetItem | null) => void
}

// Many small files are latency-bound, so a wide window is pure win. Large ones
// are bandwidth-bound and only contend with each other, so the window narrows.
function resolveConcurrency(tierCap: number, files: FileWithPreview[]): number {
  const total = files.reduce((sum, f) => sum + f.file.size, 0)
  const avg = files.length > 0 ? total / files.length : 0
  const cap =
    avg >= CDN_CONCURRENCY_MEDIUM_MAX ? 1 :
    avg >= CDN_CONCURRENCY_SMALL_MAX ? Math.min(tierCap, CDN_CONCURRENCY_MEDIUM_CAP) :
    tierCap
  return Math.max(1, Math.min(cap, files.length))
}

// Batched init, direct PUT per file to R2 (unencrypted, unlike Drive), batched finalize.
export async function runCdnUpload(
  files: FileWithPreview[],
  csrfToken: string,
  deps: CdnUploadDeps
): Promise<{ text: string; urls: string[] }> {
  const filesMeta = files.map(f => ({
    file: f.file,
    fileName: f.file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_"),
    contentType: f.file.type || "application/octet-stream",
  }))

  const initResponse = await apiFetch("/api/v2/cdn/upload-init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      files: filesMeta.map(f => ({
        fileName: f.fileName,
        fileSize: f.file.size,
        contentType: f.contentType,
      })),
      csrfToken,
      turnstileToken: deps.turnstileToken,
      folderId: deps.folderId,
      customSlug: files.length === 1 ? (deps.customSlug.trim() || null) : null,
    }),
  })

  if (!initResponse.ok) {
    const error = await initResponse.json()
    if (initResponse.status === 409) {
      const e = new Error(error.message || "Custom link already taken") as SlugConflictError
      e.slugConflict = { suggestions: error.suggestions || [] }
      throw e
    }
    throw new Error(error.message || "Failed to initialize CDN upload")
  }

  const { files: initResults } = await initResponse.json()

  // Progress is aggregated across everything in flight: per-file bytes are
  // summed against the batch total, so the bar stays monotonic no matter what
  // order the transfers land in.
  const totalBytes = files.reduce((sum, f) => sum + f.file.size, 0)
  const sentBytes = new Array<number>(files.length).fill(0)
  let done = 0
  const reportProgress = () => {
    if (totalBytes <= 0) return
    const sent = sentBytes.reduce((a, b) => a + b, 0)
    deps.onProgress(Math.min(100, (sent / totalBytes) * 100))
  }

  const putOne = (i: number) => new Promise<void>((resolve, reject) => {
    const { file } = files[i]
    const { uploadUrl, contentType } = initResults[i]
    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        sentBytes[i] = e.loaded
        reportProgress()
      }
    })
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        sentBytes[i] = file.size
        // The tray reads this as "n of N finished"; with parallel transfers it
        // counts completions rather than pointing at one file. It must be able
        // to reach files.length, or the final row never renders as done and
        // appears to hang for however long the finalize call takes.
        deps.onFileIndex(++done)
        reportProgress()
        resolve()
      } else {
        reject(new Error(`R2 upload failed (status ${xhr.status})`))
      }
    })
    xhr.addEventListener("error", () => reject(new Error("Network error uploading to R2")))
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")))
    xhr.open("PUT", uploadUrl)
    xhr.setRequestHeader("Content-Type", contentType)
    xhr.setRequestHeader("Cache-Control", IMMUTABLE_CACHE_CONTROL)
    xhr.send(file)
  })

  deps.onFileIndex(0)
  deps.onProgress(0)

  // Fixed pool of workers pulling off a shared cursor: a slot is refilled the
  // moment its transfer ends, so one slow file can't stall the others.
  const width = resolveConcurrency(deps.concurrency, files)
  let cursor = 0
  const worker = async () => {
    while (cursor < files.length) {
      await putOne(cursor++)
    }
  }
  // One rejection fails the batch, matching the old sequential behaviour: the
  // finalize call never runs, and the staging rows expire on their own.
  await Promise.all(Array.from({ length: width }, worker))

  const completedUploads: { cdnId: string; folderId: string | null }[] =
    initResults.map((r: { cdnId: string }) => ({ cdnId: r.cdnId, folderId: deps.folderId }))

  const completeRes = await apiFetch("/api/v2/cdn/upload-complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csrfToken, files: completedUploads }),
  })

  if (!completeRes.ok) {
    const error = await completeRes.json()
    if (completeRes.status === 409) {
      const e = new Error(error.message || "Custom link already taken") as SlugConflictError
      e.slugConflict = { suggestions: error.suggestions || [] }
      throw e
    }
    throw new Error(error.message || "Failed to complete CDN upload")
  }

  const { files: completedAssets } = await completeRes.json()

  const urls: string[] = []
  const rawUrls: string[] = []
  for (const asset of completedAssets) {
    rawUrls.push(asset.cdnUrl)
    urls.push(files.length === 1 ? asset.cdnUrl : `${asset.fileName}: ${asset.cdnUrl}`)
    if (deps.onUploadComplete) {
      deps.onUploadComplete({
        id: asset.id,
        name: asset.fileName,
        size: asset.fileSize,
        contentType: asset.contentType,
        folderId: asset.folderId ?? deps.folderId,
        cdnUrl: asset.cdnUrl,
        createdAt: new Date().toISOString(),
      })
    }
  }

  return { text: urls.join("\n"), urls: rawUrls }
}
