"use client"
import Link from "next/link"
import { SecondaryButton } from "@/components/ui/secondary-button"

import { MIcon } from "@/components/ui/material-icon"
import { Checkmark } from "@/components/ui/checkmark"
import { type FileItem } from "@/hooks/useManage"
import { getFileTypeLabel, getFileIconForType, isImagePreviewable, formatBytes, formatDate } from "./_helpers"
import { FileThumb } from "./_file-thumb"

export function GridView({
  files,
  selectedFiles,
  onToggleSelect,
  onCopyLink,
  copiedId,
  onDelete,
  deleteLoading,
  onContextMenu,
}: {
  files: FileItem[]
  selectedFiles: Set<string>
  onToggleSelect: (id: string) => void
  onCopyLink: (url: string, id: string) => void
  copiedId: string | null
  onDelete: (id: string) => void
  deleteLoading: string | null
  onContextMenu: (e: React.MouseEvent, id: string) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {files.map((file) => {
        const isSelected = selectedFiles.has(file.id)
        const iconName = getFileIconForType(file.contentType, file.name)
        const isImage = isImagePreviewable(file.contentType, file.name)
        return (
          <div key={file.id} className="group relative bg-[#ebebeb] dark:bg-[#222] rounded-md p-[1px] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)]" style={{ boxShadow: 'none' }}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => onToggleSelect(file.id)}
            onDoubleClick={() => window.open(`/d/${file.id}`, '_blank')}
            onContextMenu={(e) => onContextMenu(e, file.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleSelect(file.id) } }}
            className={`relative w-full aspect-square rounded-md overflow-hidden bg-[#f5f5f5] dark:bg-[#1a1a1a] cursor-pointer transition-all select-none ${
              isSelected ? "opacity-80" : "hover:opacity-90"
            }`}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <MIcon name={iconName} size={48} className="text-[#999] dark:text-[#898e97] dark:text-[#999] dark:text-[#898e97]" />
            </div>

              <div className="absolute top-2 right-2 flex items-center gap-1 z-10">

                {!!file.burnOnRead && (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-black/40 backdrop-blur-sm text-orange-400">
                    <MIcon name="local_fire_department" size={12} />
                  </span>
                )}
              </div>

              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-x-0 bottom-0 px-2 pb-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <div className="flex items-center gap-1 rounded-md bg-black/40 backdrop-blur-md p-1">
                  <SecondaryButton
                    variant="ghost"
                    theme="dark"
                    size="xs"
                    onClick={() => onCopyLink(file.shareUrl, file.id)}
                    className="flex-1"
                    style={{ gap: 6, borderRadius: 6, ...(copiedId === file.id ? { color: "#34d399" } : {}) }}
                  >
                    {copiedId === file.id ? <MIcon name="check" size={12} /> : <MIcon name="content_copy" size={12} />}
                    {copiedId === file.id ? "Copied" : "Copy"}
                  </SecondaryButton>
                  <SecondaryButton
                    variant="ghost"
                    theme="dark"
                    size="xs"
                    href={`/d/${file.id}`}
                    as={Link}
                    className="flex-1"
                    style={{ gap: 6, borderRadius: 6 }}
                  >
                    <MIcon name="visibility" size={12} />
                    View
                  </SecondaryButton>
                  <SecondaryButton
                    variant="ghost"
                    theme="dark"
                    danger
                    size="xs"
                    onClick={() => onDelete(file.id)}
                    disabled={deleteLoading === file.id}
                    className="flex-1"
                    style={{ gap: 6, borderRadius: 6 }}
                  >
                    <MIcon name="delete" size={12} />
                    {deleteLoading === file.id ? "€" : "Delete"}
                  </SecondaryButton>
                </div>
              </div>
          </div>

            <div className="mt-3 px-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#111] dark:text-white dark:text-[#e3e3e3] truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-[11px] text-[#666] dark:text-[#a1a1aa] dark:text-[#888] dark:text-[#898e97] mt-1 font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                <span className="uppercase tracking-wider">
                  {getFileTypeLabel(file.name, file.contentType)}
                </span>
                <span className="mx-1.5 text-[#999] dark:text-[#898e97] dark:text-[#a1a1aa]">·</span>
                {formatBytes(file.size)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
