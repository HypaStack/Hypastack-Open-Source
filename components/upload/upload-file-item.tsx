"use client"

import type { UploadState, FileWithPreview } from "./upload-types"
import { formatFileSize } from "./upload-types"
import { SecondaryButton } from "@/components/ui/secondary-button"

interface UploadFileItemProps {
  file: FileWithPreview
  state: UploadState
  progress: number
  copied: boolean
  onCopy: () => void
  onRemove: (id: string) => void
}

export function UploadFileItem({
  file: f,
  state,
  progress,
  copied,
  onCopy,
  onRemove,
}: UploadFileItemProps) {
  return (
    <div
      className="relative flex items-center gap-3 group"
      style={{ padding: '10px 16px' }}
    >
      {/* File info */}
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-white truncate leading-tight">
          {f.path || f.file.name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' as const, color: '#b4b4b8', backgroundColor: '#1f1f1f', padding: '2px 6px', borderRadius: 5 }}>
            {f.file.name.split(".").pop()?.substring(0, 4) || "FILE"}
          </span>
          <span style={{ fontSize: 13, color: '#a1a1aa' }}>
            {state === "done" ? "Uploaded" : state === "error" ? "Failed" : state === "uploading" ? `${formatFileSize(f.file.size * (progress / 100))} / ${formatFileSize(f.file.size)}` : "Pending"}
          </span>
        </div>
      </div>

      {/* Action */}
      {state === "done" && (
        <div className="shrink-0">
          <SecondaryButton
            size="xs"
            onClick={(e) => { e.stopPropagation(); onCopy(); }}
            style={{ borderRadius: 6, fontSize: 13 }}
          >
            {copied ? "Copied" : "Copy link"}
          </SecondaryButton>
        </div>
      )}

      {/* Upload progress bar */}
      {state === "uploading" && (
        <div className="absolute left-4 right-4" style={{ bottom: 4, height: 2, borderRadius: 1, backgroundColor: '#222' }}>
          <div style={{ height: '100%', width: `${progress}%`, borderRadius: 1, backgroundColor: '#888', transition: 'width 0.3s ease' }} />
        </div>
      )}
    </div>
  )
}
