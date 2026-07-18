"use client"

import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { Checkmark } from "@/components/ui/checkmark"
import { ContextMenu, ContextMenuItem, ContextMenuDivider } from "@/components/ui/context-menu"
import { type CdnAsset, formatBytes, formatDate, gridItemVariants, getFileIcon } from "./_helpers"

export function CdnAssetTile({
  asset,
  selected,
  onToggleSelect,
  onDragAction,
  onContextMenu,
  isMenuOpen,
  contextMenuPos,
  onCloseMenu,
  onCopy,
  onView,
  onHotSwap,
  onDelete,
  copiedId
}: {
  asset: CdnAsset
  selected: boolean
  onToggleSelect: () => void
  onDragAction: (action: 'start' | 'enter') => void
  onContextMenu: (e: React.MouseEvent, id: string) => void
  isMenuOpen: boolean
  contextMenuPos: { x: number; y: number } | null
  onCloseMenu: () => void
  onCopy: (url: string, id: string) => void
  onView: (asset: CdnAsset) => void
  onHotSwap: (asset: CdnAsset) => void
  onDelete: (id: string) => void
  copiedId: string | null
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const [imgLoading, setImgLoading] = useState(true)
  const [showSpinner, setShowSpinner] = useState(false)
  const [hover, setHover] = useState(false)
  const isImage = asset.contentType.startsWith("image/")
  const showImage = isImage && !imgFailed

  // Privacy gate. images start hidden until user confirms
  const [revealed, setRevealed] = useState(!isImage)

  // Only surface the spinner if the image is genuinely slow (>1s), so quick
  // loads don't flash a loader.
  useEffect(() => {
    if (!(revealed && showImage && imgLoading)) {
      setShowSpinner(false)
      return
    }
    const t = setTimeout(() => setShowSpinner(true), 1000)
    return () => clearTimeout(t)
  }, [revealed, showImage, imgLoading])
  
  const ext = asset.name.includes(".") ? asset.name.split(".").pop()?.toLowerCase() || "file" : "file"

  // Split the name so the label can truncate the base while always keeping the
  // extension intact.
  const dotIdx = asset.name.lastIndexOf(".")
  const baseName = dotIdx > 0 ? asset.name.slice(0, dotIdx) : asset.name

  let typeLabel = "FILE"
  if (asset.contentType) {
    const sub = asset.contentType.split("/")[1]
    if (sub) typeLabel = sub.toUpperCase()
  }

  return (
    <motion.div variants={gridItemVariants} className="group relative">
      <div
        onClick={(e) => {
          if (!e.ctrlKey) {
            onToggleSelect()
          }
        }}
        onMouseDown={(e) => {
          if (e.ctrlKey) {
            e.preventDefault()
            onDragAction('start')
          }
        }}
        onContextMenu={(e) => onContextMenu(e, asset.id)}
        onMouseEnter={(e) => {
          setHover(true)
          if (e.buttons === 1 && e.ctrlKey) {
            onDragAction('enter')
          }
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
        {!revealed && isImage && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.02)]">
            <div className="flex items-center justify-center mb-3">
              <MIcon name="image" size={20} style={{ color: '#999' }} />
            </div>
            <p className="flex items-center justify-center w-full min-w-0 text-[#888] dark:text-[#898e97]" style={{ fontSize: 12, marginBottom: 10 }}>
              <span className="shrink-0">Load&nbsp;</span>
              <span className="truncate min-w-0 text-[#333] dark:text-[#f7f8f8]" style={{ fontWeight: 500 }}>{baseName}</span>
              {dotIdx > 0 && <span className="shrink-0 text-[#333] dark:text-[#f7f8f8]" style={{ fontWeight: 500 }}>.{ext}</span>}
            </p>
            <SecondaryButton
              size="xs"
              onClick={(e) => {
                e.stopPropagation()
                setRevealed(true)
              }}
            >
              Load
            </SecondaryButton>
          </div>
        )}

        {revealed && showImage ? (
          <>
            {imgLoading && showSpinner && (
              <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-[#1e1e20]">
                <LoadingSvg size={28} />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async"
              src={asset.cdnUrl}
              alt={asset.name}
              className={`w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${imgLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setImgLoading(false)}
              onError={() => { setImgFailed(true); setImgLoading(false) }}
            />
          </>
        ) : revealed && !showImage ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2 bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.02)]">
            <MIcon name="preview_off" size={24} style={{ color: '#bbb' }} />
            <span className="text-[12px] font-medium text-[#999] dark:text-[#898e97] dark:text-[#a1a1aa]">No preview available</span>
          </div>
        ) : null}

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
            aria-label={`Select ${asset.name}`}
          />
        </div>


      </div>

      <div className="mt-2 px-1.5 pb-1 min-w-0">
        <p
          className="truncate text-[#111] dark:text-white dark:text-[#e3e3e3]"
          style={{ fontSize: 12, fontWeight: 500 }}
          title={revealed ? asset.name : undefined}
        >
          {asset.name}
        </p>
        <p style={{ fontSize: 11, color: '#888', fontVariantNumeric: 'tabular-nums' }}>
          <span className="uppercase tracking-wider">{typeLabel}</span>
          <span className="mx-1">·</span>
          {formatBytes(asset.size)}
        </p>
      </div>

      <ContextMenu isOpen={isMenuOpen} pos={contextMenuPos} onClose={onCloseMenu}>
        <ContextMenuItem
          icon={copiedId === asset.id ? "check" : "content_copy"}
          label={copiedId === asset.id ? "Copied" : "Copy link"}
          onClick={() => { onCopy(asset.cdnUrl, asset.id); onCloseMenu() }}
          accent={copiedId === asset.id ? "success" : undefined}
        />
        <ContextMenuItem
          icon="open_in_new"
          label="View asset"
          onClick={() => { onView(asset); onCloseMenu() }}
        />
        <ContextMenuDivider />
        <ContextMenuItem
          icon="swap_horiz"
          label="Hot swap"
          onClick={() => { onHotSwap(asset); onCloseMenu() }}
          accent="warning"
        />
        <ContextMenuItem
          icon="delete"
          label="Delete"
          onClick={() => { onDelete(asset.id); onCloseMenu() }}
          accent="danger"
        />
      </ContextMenu>
    </motion.div>
  )
}
