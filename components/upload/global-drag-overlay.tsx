"use client"

import { MIcon } from "@/components/ui/material-icon"

interface GlobalDragOverlayProps {
  onDrop: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
}

export function GlobalDragOverlay({ onDrop, onDragLeave }: GlobalDragOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-secondary border border-border">
          <MIcon name="cloud_upload" className="text-primary" size={40} />
        </div>
        <p className="text-2xl font-semibold text-white">Drop to Basedrop</p>
        <p className="text-sm text-muted-foreground">Release your files anywhere to upload</p>
      </div>
    </div>
  )
}
