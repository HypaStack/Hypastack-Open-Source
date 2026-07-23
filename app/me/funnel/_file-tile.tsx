"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { Checkmark } from "@/components/ui/checkmark"
import { formatBytes, formatDate, gridItemVariants } from "../cdn/_helpers"

export interface FunnelFileDto {
  id: string
  nameEncrypted: string
  wrappedKey: string
  wrappedPrivateKey: string
  fileSize: number
  contentType: string
  chunkSize: number | null
  totalParts: number | null
  createdAt: string
}

export function FunnelFileTile({
  file,
  name,
  selected,
  onToggleSelect,
  onDragAction,
}: {
  file: FunnelFileDto
  name: string | undefined
  selected: boolean
  onToggleSelect: () => void
  onDragAction: (action: "start" | "enter") => void
}) {
  const [hover, setHover] = useState(false)

  const dotIdx = name ? name.lastIndexOf(".") : -1
  const ext = dotIdx > 0 ? name!.slice(dotIdx + 1).slice(0, 5).toUpperCase() : "FILE"

  return (
    <motion.div variants={gridItemVariants} className="group relative">
      <div
        onClick={(e) => {
          if (!e.ctrlKey) onToggleSelect()
        }}
        onMouseDown={(e) => {
          if (e.ctrlKey) {
            e.preventDefault()
            onDragAction("start")
          }
        }}
        onMouseEnter={(e) => {
          setHover(true)
          if (e.buttons === 1 && e.ctrlKey) onDragAction("enter")
        }}
        onMouseLeave={() => setHover(false)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onToggleSelect()
          }
        }}
        className="relative w-full aspect-square overflow-hidden bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.02)] cursor-pointer transition-all select-none border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.06)]"
        style={{
          borderRadius: 12,
          outline: `3px solid ${selected ? "rgba(38,128,191,0.5)" : hover ? "rgba(38,128,191,0.2)" : "transparent"}`,
          outlineOffset: 2,
        }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
          <MIcon name="lock" size={24} style={{ color: "#bbb" }} />
          <span className="text-[12px] font-medium text-[#999] dark:text-[#898e97]">
            {name ? ext : "Decrypting…"}
          </span>
        </div>

        <div
          className={`absolute top-3 left-3 transition-opacity z-20 ${
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkmark
            checked={selected}
            onChange={() => onToggleSelect()}
            size={20}
            aria-label={`Select ${name || "file"}`}
          />
        </div>
      </div>

      <div className="mt-2 px-1.5 pb-1 min-w-0">
        <p
          className="truncate text-[#111] dark:text-[#e3e3e3]"
          style={{ fontSize: 12, fontWeight: 500 }}
          title={name || undefined}
        >
          {name || "Decrypting…"}
        </p>
        <p style={{ fontSize: 11, color: "#888", fontVariantNumeric: "tabular-nums" }}>
          <span className="uppercase tracking-wider">{name ? ext : "•••"}</span>
          <span className="mx-1">·</span>
          {formatBytes(file.fileSize)}
          <span className="mx-1">·</span>
          {formatDate(file.createdAt)}
        </p>
      </div>
    </motion.div>
  )
}
