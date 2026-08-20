"use client"

import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { Button, Card, Typography } from "@heroui/react"
import { toPressHandler } from "@/components/ui/button-press"
import { Checkmark } from "@/components/ui/checkmark"
import { ContextMenu, ContextMenuItem, ContextMenuAction, ContextMenuSub, ContextMenuTreeItem, ContextMenuDivider } from "@/components/ui/context-menu"
import { type CdnAsset, gridItemVariants } from "./_helpers"
import { formatBytes } from "@/lib/format"
import { type TreeNode } from "../_move-dialog"

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
  onMove,
  folderTree = [],
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
  onMove?: (id: string, folderId: string | null) => void
  folderTree?: TreeNode[]
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
  
  let typeLabel = "FILE"
  if (asset.contentType) {
    const sub = asset.contentType.split("/")[1]
    if (sub) typeLabel = sub.toUpperCase()
  }

  return (
    <motion.div variants={gridItemVariants} className="group relative">
      <Card
        variant="transparent"
        onClick={(e: React.MouseEvent) => {
          if (!e.ctrlKey) {
            onToggleSelect()
          }
        }}
        onMouseDown={(e: React.MouseEvent) => {
          if (e.ctrlKey) {
            e.preventDefault()
            onDragAction('start')
          }
        }}
        onContextMenu={(e: React.MouseEvent) => onContextMenu(e, asset.id)}
        onMouseEnter={(e: React.MouseEvent) => {
          setHover(true)
          if (e.buttons === 1 && e.ctrlKey) {
            onDragAction('enter')
          }
        }}
        onMouseLeave={() => setHover(false)}
        role="button"
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onToggleSelect()
          }
        }}
        className={`!p-0 relative w-full aspect-square overflow-hidden bg-surface cursor-pointer transition-all select-none border !border-solid rounded-[12px] ${
          selected ? "border-accent" : hover ? "border-accent/40" : "border-white/10"
        }`}
      >
        {!revealed && isImage && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center bg-surface">
            <Button
              variant="tertiary"
              size="sm"
              onPress={toPressHandler((e) => {
                e.stopPropagation()
                setRevealed(true)
              })}
            >
              Load
            </Button>
          </div>
        )}

        {revealed && showImage ? (
          <>
            {imgLoading && showSpinner && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface">
                <LoadingSvg size={28} />
              </div>
            )}
            <img loading="lazy" decoding="async"
              src={asset.cdnUrl}
              alt={asset.name}
              className={`w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${imgLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setImgLoading(false)}
              onError={() => { setImgFailed(true); setImgLoading(false) }}
            />
          </>
        ) : revealed && !showImage ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-surface">
            <Typography type="body-xs" color="muted" weight="medium">No preview available</Typography>
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
      </Card>

      <div className="mt-2 px-1.5 pb-1 min-w-0">
        <p
          className="truncate text-[#111] dark:text-[#e3e3e3]"
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
          icon="content_copy"
          label="Copy link"
          onClick={() => { onCopy(asset.cdnUrl, asset.id); onCloseMenu() }}
        />
        <ContextMenuItem
          icon="open_in_new"
          label="View asset"
          onClick={() => { onView(asset); onCloseMenu() }}
        />
        {onMove && (
          <ContextMenuSub icon="drive_file_move" label="Move asset" title="Move to">
            <ContextMenuItem
              icon="cloud"
              label="CDN Assets"
              disabled={asset.folderId === null}
              onClick={() => { onMove(asset.id, null); onCloseMenu() }}
            />
            {folderTree.map((f) => (
              <ContextMenuTreeItem
                key={f.id}
                label={f.name}
                depth={f.depth}
                isLast={f.isLast}
                ancestorsLast={f.ancestorsLast}
                disabled={asset.folderId === f.id}
                onClick={() => { onMove(asset.id, f.id); onCloseMenu() }}
              />
            ))}
          </ContextMenuSub>
        )}
        <ContextMenuDivider />
        <ContextMenuAction
          icon="swap_horiz"
          label="Hot swap"
          onClick={() => { onHotSwap(asset); onCloseMenu() }}
          tone="warning"
        />
        <ContextMenuAction
          icon="delete"
          label="Delete"
          onClick={() => { onDelete(asset.id); onCloseMenu() }}
          tone="danger"
        />
      </ContextMenu>
    </motion.div>
  )
}
