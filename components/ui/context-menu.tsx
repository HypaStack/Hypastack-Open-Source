"use client"

import { MIcon } from "@/components/ui/material-icon"
import { AnimatePresence, motion } from "motion/react"
import Link from "next/link"
import React, { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

export function ContextMenu({
  isOpen,
  pos,
  onClose,
  children
}: {
  isOpen: boolean
  pos: { x: number; y: number } | null
  onClose: () => void
  children: React.ReactNode
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    
    // Slight delay to prevent immediate close on right click if the click registers
    if (isOpen) {
      setTimeout(() => {
        window.addEventListener("click", handleClickOutside)
        window.addEventListener("contextmenu", handleClickOutside)
      }, 0)
    }
    return () => {
      window.removeEventListener("click", handleClickOutside)
      window.removeEventListener("contextmenu", handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && pos && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95, y: -5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -5 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{ top: pos.y, left: pos.x, borderRadius: 8 }}
          className="fixed z-50 flex flex-col min-w-[180px] p-1 bg-[#ffffff] dark:bg-[#1c1c1c] border border-[#e5e5e5] dark:border-[#333] shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export function ContextMenuItem({
  icon,
  label,
  onClick,
  accent,
  disabled
}: {
  icon: string
  label: string
  onClick?: () => void
  accent?: "danger" | "success" | "warning"
  disabled?: boolean
}) {
  let colorClass = "text-[#333] dark:text-[#f7f8f8] dark:text-[#ccc]"
  let hoverBg = "hover:bg-[#f5f5f5] dark:hover:bg-[rgba(255,255,255,0.06)]"
  
  if (accent === "danger") {
    colorClass = "text-red-500"
    hoverBg = "hover:bg-red-50 dark:hover:bg-red-500/10"
  } else if (accent === "success") {
    colorClass = "text-emerald-500"
    hoverBg = "hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
  } else if (accent === "warning") {
    colorClass = "text-amber-500"
    hoverBg = "hover:bg-amber-50 dark:hover:bg-amber-500/10"
  }

  if (disabled) {
    colorClass = "text-[#aaa] dark:text-[#555]"
    hoverBg = ""
  }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium transition-colors ${colorClass} ${hoverBg} ${disabled ? "cursor-not-allowed opacity-70" : "active:scale-[0.98]"}`}
      style={{ borderRadius: 6 }}
    >
      <MIcon name={icon} size={16} />
      <span>{label}</span>
    </button>
  )
}

export function ContextMenuLink({
  icon,
  label,
  href,
  onClick,
  target
}: {
  icon: string
  label: string
  href: string
  onClick?: () => void
  target?: string
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      target={target}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-[#333] dark:text-[#f7f8f8] dark:text-[#ccc] hover:bg-[#f5f5f5] dark:hover:bg-[rgba(255,255,255,0.06)] active:scale-[0.98] transition-colors"
      style={{ borderRadius: 6 }}
    >
      <MIcon name={icon} size={16} />
      <span>{label}</span>
    </Link>
  )
}

export function ContextMenuDivider() {
  return <div className="h-[1px] w-full bg-[#e5e5e5] dark:bg-[#333] my-1" />
}
