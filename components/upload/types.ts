import type { CdnAssetItem } from "@/hooks/useManage"

export type UploadState =
  | "idle"
  | "selected"
  | "zipping"
  | "encrypting"
  | "uploading"
  | "done"
  | "error"
  | "copied"

export interface FileWithPreview {
  file: File
  id: string
  path?: string
}

export type SlugConflictError = Error & { slugConflict: { suggestions: string[] } }

export interface UploadZoneProps {
  initialFiles?: FileList | File[] | null
  autoStart?: boolean
  uploadType?: "files" | "cdn"
  onUploadComplete?: (asset: CdnAssetItem | null) => void
  onUploadStateChange?: (state: UploadState) => void
  currentFolderId?: string | null
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
