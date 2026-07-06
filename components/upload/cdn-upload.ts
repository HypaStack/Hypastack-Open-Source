import { apiFetch } from "@/lib/http/fetch"
import { IMMUTABLE_CACHE_CONTROL } from "@/constants/upload"
import type { FileWithPreview } from "./types"

interface CdnUploadDeps {
  turnstileToken: string
  folderId: string | null
  customSlug: string
  uploadDelayMs: number
  onFileIndex: (i: number) => void
  onProgress: (pct: number) => void
  onUploadComplete?: (asset: any) => void
}

// Uploads the selected files to the CDN: one batched init (a single Turnstile
// check), a direct PUT per file to R2, then a batched finalize. CDN assets are
// served raw (no client-side encryption), unlike Drive uploads. Returns the
// joined share-URL text for the tray.
export async function runCdnUpload(
  files: FileWithPreview[],
  csrfToken: string,
  deps: CdnUploadDeps
): Promise<string> {
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
      const e: any = new Error(error.error || "Custom link already taken")
      e.slugConflict = { suggestions: error.suggestions || [] }
      throw e
    }
    throw new Error(error.error || "Failed to initialize CDN upload")
  }

  const { files: initResults } = await initResponse.json()
  const completedUploads: { cdnId: string; sanitizedName: string; contentType: string; slug: string | null }[] = []

  for (let i = 0; i < files.length; i++) {
    if (i > 0 && deps.uploadDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, deps.uploadDelayMs))
    }
    deps.onFileIndex(i)
    deps.onProgress(0)

    const { file } = files[i]
    const { cdnId, uploadUrl, sanitizedName, contentType, slug } = initResults[i]

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          deps.onProgress((e.loaded / e.total) * 100)
        }
      })
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          deps.onProgress(100)
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

    completedUploads.push({ cdnId, sanitizedName, contentType, slug: slug ?? null })
  }

  const completeRes = await apiFetch("/api/v2/cdn/upload-complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      files: completedUploads.map(u => ({
        cdnId: u.cdnId,
        sanitizedName: u.sanitizedName,
        contentType: u.contentType,
        folderId: deps.folderId,
        slug: u.slug,
      })),
    }),
  })

  if (!completeRes.ok) {
    const error = await completeRes.json()
    if (completeRes.status === 409) {
      const e: any = new Error(error.error || "Custom link already taken")
      e.slugConflict = { suggestions: error.suggestions || [] }
      throw e
    }
    throw new Error(error.error || "Failed to complete CDN upload")
  }

  const { files: completedAssets } = await completeRes.json()

  const urls: string[] = []
  for (const asset of completedAssets) {
    urls.push(files.length === 1 ? asset.cdnUrl : `${asset.fileName}: ${asset.cdnUrl}`)
    if (deps.onUploadComplete) {
      deps.onUploadComplete({
        id: asset.id,
        name: asset.fileName,
        size: asset.fileSize,
        contentType: asset.contentType,
        cdnUrl: asset.cdnUrl,
        createdAt: new Date().toISOString(),
      })
    }
  }

  return urls.join("\n")
}
