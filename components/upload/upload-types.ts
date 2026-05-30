export type UploadState = "idle" | "selected" | "zipping" | "uploading" | "done" | "error"

export interface FileWithPreview {
  file: File
  id: string
  path?: string
}

export interface UploadZoneProps {
  /** Files passed in from outside (e.g., a hidden file input on the parent
   * page). When provided, the zone seeds itself with these files and tries
   * to start the upload automatically once the security plumbing is ready. */
  initialFiles?: FileList | File[] | null
  /** Whether to automatically start uploading when seeded with initialFiles. Default is true. */
  autoStart?: boolean
  /** Upload mode. "files" uses multipart+encryption. "cdn" uses public R2 upload. */
  uploadType?: "files" | "cdn"
  /** Callback fired when a CDN upload completes. */
  onUploadComplete?: (asset: any) => void
}

export interface InterruptedSession {
  fileId: string
  uploadId: string
  r2Key: string
  totalParts: number
  chunkSize: number
  fileName: string
  fileSize: number
  keyBase64: string
  shareUrl: string
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export function getLinkDuration(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  if (mb < 25) return "7 days"
  if (mb < 50) return "5 days"
  return "3 days"
}
