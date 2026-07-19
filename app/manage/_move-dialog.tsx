"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { ShineButton } from "@/components/ui/shine-button"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { Loader } from "@/components/ui/loader"

export interface MoveTarget {
  id: string
  name: string
  parentId: string | null
}

// Flattens the folder tree into display rows, deepest paths shown as "Parent / Child".
function toPaths(folders: MoveTarget[]): { id: string; path: string }[] {
  const byId = new Map(folders.map(f => [f.id, f]))
  return folders
    .map(f => {
      const parts = [f.name]
      let parent = f.parentId
      while (parent) {
        const p = byId.get(parent)
        if (!p) break
        parts.unshift(p.name)
        parent = p.parentId
      }
      return { id: f.id, path: parts.join(" / ") }
    })
    .sort((a, b) => a.path.localeCompare(b.path))
}

export function MoveDialog({
  count,
  folders,
  currentFolderId,
  rootLabel,
  onCancel,
  onMove,
}: {
  count: number
  folders: MoveTarget[]
  currentFolderId: string | null
  rootLabel: string
  onCancel: () => void
  onMove: (folderId: string | null) => Promise<void>
}) {
  const [target, setTarget] = useState<string | null>(null)
  const [moving, setMoving] = useState(false)

  const rows = toPaths(folders)
  const isCurrent = target === currentFolderId

  const submit = async () => {
    setMoving(true)
    try {
      await onMove(target)
    } finally {
      setMoving(false)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[60] bg-black/30"
        onClick={onCancel}
      />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full max-w-md flex flex-col rounded-[16px] bg-white dark:bg-[#141416] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] overflow-hidden pointer-events-auto"
        >
          <div className="px-5 pt-4 pb-3">
            <h2 className="text-[16px] font-semibold text-[#171717] dark:text-[#e3e3e3]">
              Move {count} {count === 1 ? "item" : "items"}
            </h2>
            <p className="text-[13px] text-[#666] dark:text-[#898e97] mt-1">Pick where they should end up.</p>
          </div>

          <div className="max-h-[280px] overflow-y-auto px-3 pb-3 flex flex-col gap-1">
            {[{ id: null as string | null, path: rootLabel }, ...rows].map(row => {
              const selected = target === row.id
              return (
                <button
                  key={row.id ?? "__root"}
                  type="button"
                  onClick={() => setTarget(row.id)}
                  className={`flex items-center gap-2.5 px-3 h-[38px] rounded-[8px] text-left transition-colors ${
                    selected
                      ? "bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.08)]"
                      : "hover:bg-[#f6f6f6] dark:hover:bg-[rgba(255,255,255,0.04)]"
                  }`}
                >
                  <MIcon
                    name={row.id === null ? "home_storage" : "folder"}
                    size={16}
                    className="text-[#666] dark:text-[#898e97] shrink-0"
                  />
                  <span className="text-[14px] text-[#111] dark:text-[#f7f8f8] truncate flex-1">{row.path}</span>
                  {row.id === currentFolderId && (
                    <span className="text-[11px] text-[#888] dark:text-[#898e97] shrink-0">Current</span>
                  )}
                  {selected && <MIcon name="check" size={15} className="text-[#111] dark:text-[#f7f8f8] shrink-0" />}
                </button>
              )
            })}
          </div>

          <div className="flex justify-end gap-2 px-3 pb-3">
            <SecondaryButton size="md" onClick={onCancel} disabled={moving}>
              Cancel
            </SecondaryButton>
            <ShineButton size="md" onClick={submit} disabled={moving || isCurrent} style={{ gap: 8 }}>
              {moving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader size={16} color="#ffffff" />
                  Moving…
                </span>
              ) : (
                <>
                  <MIcon name="drive_file_move" size={15} className="shrink-0" />
                  Move here
                </>
              )}
            </ShineButton>
          </div>
        </motion.div>
      </div>
    </>
  )
}
