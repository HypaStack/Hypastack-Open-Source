"use client"

import { MIcon } from "@/components/ui/material-icon"
import { Checkmark } from "@/components/ui/checkmark"
import { type FileItem } from "@/hooks/useManage"
import { formatBytes, type SortField, type SortDirection } from "./_helpers"

export function ListView({
  files,
  selectedFiles,
  allSelected,
  sortField,
  sortDirection,
  onToggleSort,
  onToggleSelect,
  onToggleSelectAll,
  onCopyLink,
  copiedId,
  onDelete,
  deleteLoading,
  onContextMenu,
}: {
  files: FileItem[]
  selectedFiles: Set<string>
  allSelected: boolean
  sortField: SortField
  sortDirection: SortDirection
  onToggleSort: (f: SortField) => void
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  onCopyLink: (url: string, id: string) => void
  copiedId: string | null
  onDelete: (id: string) => void
  deleteLoading: string | null
  onContextMenu: (e: React.MouseEvent, id: string) => void
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-3">
      {files.map((file) => {
        const isSelected = selectedFiles.has(file.id)
        return (
          <div
            key={file.id}
            data-selected={isSelected}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('button')) return
              onToggleSelect(file.id)
            }}
            onDoubleClick={(e) => {
              if ((e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('button')) return
              window.open(`/d/${file.id}`, '_blank')
            }}
            onContextMenu={(e) => onContextMenu(e, file.id)}
            className="group relative flex flex-col items-center gap-1 py-2 px-2 w-full rounded-[12px] cursor-pointer select-none data-[selected=true]:bg-[rgba(59,130,246,0.12)]"
          >
            {/*
              Opacity lives on this wrapper, not the checkmark: revealed on hover
              or when selected, always reachable on touch (same pattern as folders).
            */}
            <span
              onClick={(e) => e.stopPropagation()}
              className="absolute top-1 left-1 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 group-data-[selected=true]:opacity-100 transition-opacity"
            >
              <Checkmark
                checked={isSelected}
                onChange={() => onToggleSelect(file.id)}
                aria-label={`Select ${file.name}`}
              />
            </span>

            {!!file.burnOnRead && (
              <span title="Burn on read" className="absolute top-1 right-1 z-10 text-orange-400">
                <MIcon name="local_fire_department" size={14} />
              </span>
            )}

            <img
              loading="lazy"
              decoding="async"
              src="https://r2.hypastack.com/cdn/dashboardasset/folder.webp"
              alt=""
              className="w-[88px] h-auto pointer-events-none group-active:scale-[0.97] transition-transform"
            />

            <div className="flex w-full items-center justify-center gap-1 text-[12px] text-[#888] dark:text-[#898e97]">
              <span className="min-w-0 truncate text-[#111] dark:text-[#e3e3e3]" title={file.name}>{file.name}</span>
              <span className="w-1 h-1 rounded-full bg-[#ccc] dark:bg-[#555] shrink-0" />
              <span className="shrink-0">{formatBytes(file.size)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
