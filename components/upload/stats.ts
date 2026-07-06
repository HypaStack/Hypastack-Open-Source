import { formatFileSize } from "./utils"
import type { FileWithPreview } from "./types"

// Live "1.2 MB / 5 MB • 3.4 MB/s • 12s left" line for the upload tray. Pure:
// derives everything from the current file list + progress, no hook state.
export function formatUploadStats(
  files: FileWithPreview[],
  uploadingIndex: number,
  progress: number,
  startTime: number
): string {
  const totalBytes = files.reduce((acc, f) => acc + f.file.size, 0)
  let uploadedPastFilesBytes = 0
  for (let i = 0; i < uploadingIndex; i++) {
    uploadedPastFilesBytes += files[i].file.size
  }
  const currentFileBytes = files[uploadingIndex]?.file.size || 0
  const bytesUploaded = uploadedPastFilesBytes + currentFileBytes * (progress / 100)

  const elapsed = (Date.now() - startTime) / 1000
  if (elapsed < 1 || bytesUploaded === 0) return "Starting..."

  const speed = bytesUploaded / elapsed
  const remaining = totalBytes - bytesUploaded
  const etaSeconds = Math.ceil(remaining / speed)
  const speedStr =
    speed >= 1024 * 1024
      ? `${(speed / (1024 * 1024)).toFixed(1)} MB/s`
      : `${(speed / 1024).toFixed(0)} KB/s`

  const progressStr = `${formatFileSize(bytesUploaded)} / ${formatFileSize(totalBytes)}`

  if (etaSeconds < 5) return `${progressStr} • ${speedStr} • Almost done`
  if (etaSeconds < 60) return `${progressStr} • ${speedStr} • ${etaSeconds}s left`
  const mins = Math.floor(etaSeconds / 60)
  const secs = etaSeconds % 60
  return `${progressStr} • ${speedStr} • ${mins}m ${secs}s left`
}
