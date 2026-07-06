import type { FileWithPreview } from "./types"

// Short random id for a picked file (client-only, collision-tolerant).
export function generateFileId(): string {
  return Math.random().toString(36).slice(2, 11)
}

export interface FileSelection {
  accepted: FileWithPreview[]
  fileErrors: string[]
  limitExceeded: boolean
  totalSize: number
  totalSizeExceeded: boolean
}

// Validates a newly-picked FileList against the current selection and tier
// limits. Pure — returns what to accept and which limits tripped; the hook maps
// that to error message + state.
export function selectFiles(
  fileList: FileList,
  existing: FileWithPreview[],
  limits: { maxFiles: number; maxSize: number; maxSizeLabel: string }
): FileSelection {
  const accepted: FileWithPreview[] = []
  const fileErrors: string[] = []
  let limitExceeded = false

  Array.from(fileList).forEach((f) => {
    if (existing.length + accepted.length >= limits.maxFiles) {
      limitExceeded = true
      return
    }
    if (f.size > limits.maxSize) {
      fileErrors.push(`"${f.name}" exceeds ${limits.maxSizeLabel}`)
    } else {
      accepted.push({ file: f, id: generateFileId(), path: f.name })
    }
  })

  const existingSize = existing.reduce((sum, f) => sum + f.file.size, 0)
  const newSize = accepted.reduce((sum, f) => sum + f.file.size, 0)
  const totalSize = existingSize + newSize

  return {
    accepted,
    fileErrors,
    limitExceeded,
    totalSize,
    totalSizeExceeded: totalSize > limits.maxSize,
  }
}
