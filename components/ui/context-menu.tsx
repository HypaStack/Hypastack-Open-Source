"use client"

import React, { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import Link from "next/link"
import { MIcon } from "@/components/ui/material-icon"
import { Button, Separator, menuVariants, menuItemVariants } from "@heroui/react"

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

const TONE_VAR: Record<string, string> = {
  danger: "var(--danger)",
  warning: "var(--warning)",
  success: "var(--success)",
  primary: "var(--accent)",
}

const EDGE = 8
const PANEL = menuVariants() + " shadow-[0_16px_48px_rgba(0,0,0,0.16),0_3px_10px_rgba(0,0,0,0.08)] bg-[var(--overlay)]"
const ROW = menuItemVariants() + " text-left"

/**
 * Right-click context menu: portaled, positioned at the click coordinates and
 * clamped back inside the viewport. No HeroUI component anchors to arbitrary
 * cursor coordinates (their Menu triggers off a real DOM element), so this
 * positioning shell stays custom — everything it renders (panel, rows,
 * dividers) uses HeroUI's real menu classes/tokens/Separator.
 */
export function ContextMenu({
  isOpen,
  pos,
  onClose,
  width = 250,
  children,
}: {
  isOpen: boolean
  pos: { x: number; y: number } | null
  onClose: () => void
  width?: number
  children: React.ReactNode
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [at, setAt] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => setMounted(true), [])

  // Pull the menu back inside the viewport from whichever edge it overran.
  useIsoLayoutEffect(() => {
    if (!isOpen || !pos) { setAt(null); return }
    const el = menuRef.current
    if (!el) { setAt(pos); return }
    const { width: w, height: h } = el.getBoundingClientRect()
    setAt({
      x: Math.max(EDGE, Math.min(pos.x, window.innerWidth - w - EDGE)),
      y: Math.max(EDGE, Math.min(pos.y, window.innerHeight - h - EDGE)),
    })
  }, [isOpen, pos])

  useEffect(() => {
    if (!isOpen) return
    const outside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    const id = window.setTimeout(() => {
      window.addEventListener("mousedown", outside)
      window.addEventListener("contextmenu", outside)
    }, 0)
    window.addEventListener("keydown", onKey)
    window.addEventListener("resize", onClose)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener("mousedown", outside)
      window.removeEventListener("contextmenu", outside)
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("resize", onClose)
    }
  }, [isOpen, onClose])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && pos && (
        <motion.div
          ref={menuRef}
          role="menu"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
          style={{ top: (at ?? pos).y, left: (at ?? pos).x, width }}
          className={`fixed z-[120] ${PANEL}`}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation() }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function ContextMenuItem({
  icon,
  label,
  onClick,
  accent,
  disabled,
  trailing,
}: {
  icon: string
  label: string
  onClick?: () => void
  accent?: "danger" | "success" | "warning"
  disabled?: boolean
  trailing?: React.ReactNode
}) {
  const tint = accent ? TONE_VAR[accent] : undefined

  return (
    <button
      type="button"
      role="menuitem"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${ROW} ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      style={tint ? { color: tint } : undefined}
    >
      <MIcon name={icon} size={18} className="shrink-0" style={tint ? { color: tint } : undefined} />
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {trailing && <span className="shrink-0 flex items-center">{trailing}</span>}
    </button>
  )
}

export function ContextMenuLink({
  icon,
  label,
  href,
  onClick,
  target,
}: {
  icon: string
  label: string
  href: string
  onClick?: () => void
  target?: string
}) {
  return (
    <Link href={href} target={target} onClick={onClick} role="menuitem" className={ROW}>
      <MIcon name={icon} size={18} className="shrink-0" />
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {target === "_blank" && <MIcon name="north_east" size={15} className="shrink-0 opacity-50" />}
    </Link>
  )
}

/**
 * A row that opens a second panel beside the menu. Opens on hover with a short
 * close grace period so the pointer can travel across the gap, and flips to the
 * left when there isn't room on the right.
 */
export function ContextMenuSub({
  icon,
  label,
  title,
  width = 230,
  children,
}: {
  icon: string
  label: string
  /** Small heading above the submenu rows. */
  title?: string
  width?: number
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [flip, setFlip] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const enter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    const el = rowRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      setFlip(r.right + width + EDGE > window.innerWidth)
    }
    setOpen(true)
  }
  const leave = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 140)
  }

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])

  return (
    <div ref={rowRef} className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${ROW} cursor-pointer ${open ? "bg-[var(--default)]" : ""}`}
      >
        <MIcon name={icon} size={18} className="shrink-0" />
        <span className="flex-1 min-w-0 truncate">{label}</span>
        <MIcon name="chevron_right" size={18} className="shrink-0 opacity-60" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: flip ? 4 : -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: flip ? 4 : -4 }}
            transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
            className={`absolute top-0 z-[121] max-h-[300px] overflow-y-auto ${PANEL} [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`}
            style={{ width, ...(flip ? { right: "100%", marginRight: 6 } : { left: "100%", marginLeft: 6 }) }}
          >
            {title && (
              <div className="px-2.5 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#898e97] dark:text-[#898e97]">
                {title}
              </div>
            )}
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const GUIDE = "border-[#d8d8dc] dark:border-[rgba(255,255,255,0.16)]"
const RAIL = 15

/**
 * A row inside a tree. Draws its own connectors: a vertical line for every
 * ancestor level still expecting more siblings, then a tee or an elbow into
 * this row's own icon.
 */
export function ContextMenuTreeItem({
  icon = "folder",
  label,
  depth,
  isLast,
  ancestorsLast,
  onClick,
  disabled,
}: {
  icon?: string
  label: string
  depth: number
  isLast: boolean
  ancestorsLast: boolean[]
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${ROW} ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"} !pl-1.5 !gap-0`}
    >
      {ancestorsLast.slice(0, depth).map((wasLast, i) => (
        <span key={i} className="self-stretch relative shrink-0" style={{ width: RAIL }}>
          {!wasLast && <span className={`absolute top-0 bottom-0 border-l ${GUIDE}`} style={{ left: "50%" }} />}
        </span>
      ))}

      <span className="self-stretch relative shrink-0" style={{ width: RAIL }}>
        <span
          className={`absolute top-0 border-l ${GUIDE}`}
          style={{ left: "50%", height: isLast ? "50%" : "100%" }}
        />
        <span className={`absolute border-t ${GUIDE}`} style={{ left: "50%", top: "50%", width: "50%" }} />
      </span>

      <MIcon name={icon} size={17} className="shrink-0 mr-2 opacity-70" />
      <span className="flex-1 min-w-0 truncate">{label}</span>
    </button>
  )
}

/** A weighted action, styled as the same button that action uses elsewhere. */
export function ContextMenuAction({
  icon,
  label,
  onClick,
  tone = "primary",
  disabled,
}: {
  icon: string
  label: string
  onClick?: () => void
  tone?: "danger" | "warning" | "success" | "primary"
  disabled?: boolean
}) {
  const color = TONE_VAR[tone]
  return (
    <Button
      variant="primary"
      size="md"
      fullWidth
      onPress={onClick}
      isDisabled={disabled}
      style={{
        ["--button-bg" as string]: color,
        ["--button-bg-hover" as string]: color,
        gap: 10,
        justifyContent: "flex-start",
        paddingLeft: 10,
        paddingRight: 10,
      }}
    >
      <MIcon name={icon} size={18} />
      {label}
    </Button>
  )
}

export function ContextMenuDivider() {
  return <Separator className="my-1" />
}
