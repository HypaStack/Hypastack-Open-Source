"use client"

import { MIcon } from "@/components/ui/material-icon"
import { Checkmark } from "@/components/ui/checkmark"
import { type FileItem } from "@/hooks/useManage"
import { getFileTypeLabel, getFileIconForType, isImagePreviewable, formatBytes, formatDate, type SortField, type SortDirection } from "./_helpers"
import { FileThumb } from "./_file-thumb"

function SortLabel({
  label,
  field,
  current,
  direction,
  onClick,
}: {
  label: string
  field: SortField
  current: SortField
  direction: SortDirection
  onClick: (f: SortField) => void
}) {
  const active = current === field
  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      className={`inline-flex items-center gap-1.5 text-[14px] font-medium tracking-wide transition-colors ${
        active ? "text-[#111] dark:text-white dark:text-[#f0f0f0]" : "text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] hover:text-[#333] dark:text-[#f7f8f8] dark:hover:text-[#ccc]"
      }`}
    >
      {label}
      <MIcon
        name="keyboard_arrow_down"
        size={14}
        className={`transition-all ${
          active
            ? `opacity-100 ${direction === "asc" ? "rotate-180" : ""}`
            : "opacity-0"
        }`}
      />
    </button>
  )
}

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
    <div className="bg-[#f4f4f4] dark:bg-[rgba(255,255,255,0.04)] border border-[rgba(0,0,0,0.07)] dark:border-[rgba(255,255,255,0.06)] rounded-[14px]" style={{ padding: 1, boxShadow: 'none' }}>
      <div className="grid grid-cols-[44px_1fr_44px] md:grid-cols-[44px_1fr_240px_140px_44px] items-center gap-2 md:gap-4 px-3 py-2">
        <Checkmark
          checked={allSelected}
          onChange={() => onToggleSelectAll()}
          aria-label="Select all"
        />
        <SortLabel label="Name" field="name" current={sortField} direction={sortDirection} onClick={onToggleSort} />
        <div className="hidden md:block">
          <SortLabel label="Modified" field="date" current={sortField} direction={sortDirection} onClick={onToggleSort} />
        </div>
        <div className="hidden md:block">
          <SortLabel label="Size" field="size" current={sortField} direction={sortDirection} onClick={onToggleSort} />
        </div>
        <span />
      </div>

      <div className="bg-white dark:bg-[#0e0f10]" style={{ borderRadius: 12, overflow: 'hidden' }}>
        {files.map((file) => {
          const isSelected = selectedFiles.has(file.id)
          const Icon = getFileIconForType(file.contentType, file.name)
          const isImage = isImagePreviewable(file.contentType, file.name)
          return (
            <div
              key={file.id}
              data-selected={isSelected}
              className="drive-row group grid grid-cols-[44px_1fr_44px] md:grid-cols-[44px_1fr_240px_140px_44px] items-center gap-2 md:gap-4 px-3 py-3 cursor-pointer select-none"
              onClick={(e) => {
                // If they clicked the checkbox or buttons, ignore
                if ((e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('button')) return;
                onToggleSelect(file.id);
              }}
              onDoubleClick={(e) => {
                if ((e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('button')) return;
                window.open(`/d/${file.id}`, '_blank');
              }}
              onContextMenu={(e) => onContextMenu(e, file.id)}
            >
              <span onClick={(e) => e.stopPropagation()}>
                <Checkmark
                  checked={isSelected}
                  onChange={() => onToggleSelect(file.id)}
                  aria-label={`Select ${file.name}`}
                />
              </span>

              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative h-8 w-8 rounded-md overflow-hidden shrink-0 flex items-center justify-center text-[#444] dark:text-[#ccc]">
                  <MIcon name={getFileIconForType(file.contentType, file.name)} size={22} />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[14px] font-normal text-[#111] dark:text-white dark:text-[#e3e3e3] truncate" title={file.name}>
                      {file.name}
                    </span>

                    {!!file.burnOnRead && (
                      <span title="Burn on read" className="text-orange-400 shrink-0">
                        <MIcon name="local_fire_department" size={13} />
                      </span>
                    )}
                  </div>
                  <div className="flex md:hidden items-center gap-2 mt-0.5 text-[12px] text-[#888] dark:text-[#898e97]">
                    <span>{formatBytes(file.size)}</span>
                    <span className="w-1 h-1 rounded-full bg-[#ccc] dark:bg-[#555]" />
                    <span>{formatDate(file.uploadedAt).split(' at ')[0]}</span>
                  </div>
                </div>
              </div>

              <span className="hidden md:block text-[13px] text-[#999] dark:text-[#898e97] dark:text-[#a1a1aa] font-normal" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatDate(file.uploadedAt)}
              </span>

              <span className="hidden md:block text-[13px] text-[#999] dark:text-[#898e97] dark:text-[#a1a1aa] font-normal" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatBytes(file.size)}
              </span>

              <div className="relative flex justify-end">
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
