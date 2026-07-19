"use client"

import React, { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import Link from "next/link"
import { MIcon } from "@/components/ui/material-icon"
import { MenuItem } from "@/components/ui/menu-item"
import { ShineButton } from "@/components/ui/shine-button"

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

/** Fill + hover fill for an accent action, matching the buttons used elsewhere. */
const TONE: Record<string, { color: string; hover: string }> = {
  danger: { color: "#dc2626", hover: "#b91c1c" },
  warning: { color: "#d97706", hover: "#b45309" },
  success: { color: "#059669", hover: "#047857" },
  primary: { color: "#2680bf", hover: "#1f6ba0" },
}

const EDGE = 8

export function ContextMenu({
  isOpen,
  pos,
  onClose,
  width = 200,
  children,
}: {
  isOpen: boolean
  pos: { x: number; y: number } | null
  onClose: () => void
  /** Menu width in px. */
  width?: number
  children: React.ReactNode
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [at, setAt] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => setMounted(true), [])

  // Keep the menu inside the viewport — flip it back from whichever edge it
  // would have run past, so a right click near the bottom still shows it all.
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
    window.addEventListener("scroll", onClose, true)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener("mousedown", outside)
      window.removeEventListener("contextmenu", outside)
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("resize", onClose)
      window.removeEventListener("scroll", onClose, true)
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
          style={{
            top: (at ?? pos).y,
            left: (at ?? pos).x,
            width,
            boxShadow: "0 16px 48px rgba(0,0,0,0.16), 0 3px 10px rgba(0,0,0,0.08)",
          }}
          className="fixed z-[120] flex flex-col gap-0.5 p-1.5 rounded-[14px] bg-white dark:bg-[#1c1c1f]"
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation() }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** Neutral row. `accent` tints the label only — use ContextMenuAction for buttons. */
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
  return (
    <MenuItem
      icon={<MIcon name={icon} size={17} />}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      danger={accent === "danger"}
      trailing={trailing}
      style={{
        fontSize: 13,
        ...(accent === "success" ? { color: "#059669" } : {}),
        ...(accent === "warning" ? { color: "#d97706" } : {}),
      }}
    >
      {label}
    </MenuItem>
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
    <MenuItem
      as={Link}
      href={href}
      onClick={onClick}
      icon={<MIcon name={icon} size={17} />}
      style={{ fontSize: 13 }}
      trailing={target === "_blank" ? <MIcon name="north_east" size={14} /> : undefined}
    >
      {label}
    </MenuItem>
  )
}

/**
 * A weighted action — delete, swap, and friends. Renders the same button the
 * rest of the app uses for that action, so a destructive row in a menu reads
 * exactly like the destructive button in a toolbar.
 */
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
  const t = TONE[tone]
  return (
    <ShineButton
      size="sm"
      fullWidth
      onClick={onClick}
      disabled={disabled}
      color={t.color}
      hoverColor={t.hover}
      style={{ gap: 8, justifyContent: "flex-start", paddingLeft: 10, paddingRight: 10 }}
    >
      <MIcon name={icon} size={16} />
      {label}
    </ShineButton>
  )
}

export function ContextMenuDivider() {
  return <div className="h-px w-full bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.06)] my-1" />
}
