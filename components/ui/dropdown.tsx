"use client"

import { useState, useRef, useEffect, useCallback, type CSSProperties, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { motion } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { useThemeMode, type ThemeMode } from "./use-theme-mode"

export interface DropdownOption<T extends string | number = string> {
  value: T
  label: ReactNode
  disabled?: boolean
}

type Size = "sm" | "md"

const SIZES: Record<Size, { height: number; fontSize: number; padX: number; radius: number }> = {
  sm: { height: 32, fontSize: 13, padX: 10, radius: 10 },
  md: { height: 40, fontSize: 14, padX: 12, radius: 12 },
}

const PALETTE = {
  dark: {
    triggerBg: "rgba(255,255,255,0.04)",
    triggerHoverBg: "rgba(255,255,255,0.07)",
    border: "rgba(255,255,255,0.1)",
    text: "#f7f8f8",
    placeholder: "rgba(255,255,255,0.4)",
    icon: "#898e97",
    menuBg: "#141416",
    menuBorder: "rgba(255,255,255,0.08)",
    optionText: "#cccccc",
    optionHover: "rgba(255,255,255,0.06)",
    selectedBg: "rgba(38,128,191,0.16)",
    selectedText: "#f7f8f8",
  },
  light: {
    triggerBg: "#ffffff",
    triggerHoverBg: "#f7f7f7",
    border: "rgba(0,0,0,0.12)",
    text: "#171717",
    placeholder: "rgba(0,0,0,0.4)",
    icon: "#666666",
    menuBg: "#ffffff",
    menuBorder: "#ebebeb",
    optionText: "#333333",
    optionHover: "#f4f4f4",
    selectedBg: "rgba(38,128,191,0.1)",
    selectedText: "#111111",
  },
} as const

interface DropdownProps<T extends string | number = string> {
  value: T
  onChange: (value: T) => void
  options: DropdownOption<T>[]
  placeholder?: string
  disabled?: boolean
  fullWidth?: boolean
  size?: Size
  /** Which way the menu opens. */
  direction?: "down" | "up"
  /** Scrollable menu cap in px. */
  maxMenuHeight?: number
  /** "auto" follows the app's dark class / prefers-color-scheme. */
  theme?: ThemeMode
  className?: string
  /** Applied to the trigger wrapper (layout tweaks like width). */
  style?: CSSProperties
  "aria-label"?: string
}

/**
 * Reusable select-style dropdown: a trigger showing the current option and a
 * portal-rendered menu (so it's never clipped by scroll containers). Options,
 * sizes and open direction are all configurable.
 *
 * Portable: all essential styling is inline and hover is handled in JS, so no
 * global CSS is required.
 */
export function Dropdown<T extends string | number = string>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled = false,
  fullWidth = false,
  size = "md",
  direction = "down",
  maxMenuHeight = 260,
  theme = "auto",
  className,
  style,
  "aria-label": ariaLabel,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const c = PALETTE[useThemeMode(theme)]
  const s = SIZES[size]

  useEffect(() => setMounted(true), [])

  const updatePos = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos(
      direction === "up"
        ? { left: r.left, width: r.width, bottom: window.innerHeight - r.top + 6 }
        : { left: r.left, width: r.width, top: r.bottom + 6 },
    )
  }, [direction])

  useEffect(() => {
    if (!open) return
    updatePos()
    const reposition = () => updatePos()
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("scroll", reposition, true)
    window.addEventListener("resize", reposition)
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("scroll", reposition, true)
      window.removeEventListener("resize", reposition)
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open, updatePos])

  const selected = options.find((o) => o.value === value)

  return (
    <div className={className} style={{ display: fullWidth ? "block" : "inline-block", ...style }}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((o) => !o)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxSizing: "border-box",
          width: fullWidth ? "100%" : "auto",
          height: s.height,
          padding: `0 ${s.padX}px`,
          borderRadius: s.radius,
          border: `0.7px solid ${c.border}`,
          backgroundColor: disabled ? c.triggerBg : hover || open ? c.triggerHoverBg : c.triggerBg,
          color: c.text,
          fontSize: s.fontSize,
          fontWeight: 500,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          userSelect: "none",
          transition: "background-color 0.15s ease-in-out",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left", color: selected ? c.text : c.placeholder }}>
          {selected ? selected.label : placeholder}
        </span>
        <MIcon name="keyboard_arrow_down" size={18} style={{ color: c.icon, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }} />
      </button>

      {mounted && open && pos && createPortal(
        <motion.div
          ref={menuRef}
          role="listbox"
          initial={{ opacity: 0, y: direction === "down" ? -4 : 4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.14, ease: [0.2, 0, 0, 1] }}
          style={{
            position: "fixed",
            zIndex: 200,
            left: pos.left,
            width: pos.width,
            ...(pos.top !== undefined ? { top: pos.top } : { bottom: pos.bottom }),
            backgroundColor: c.menuBg,
            border: `1px solid ${c.menuBorder}`,
            borderRadius: 12,
            boxShadow: "0 12px 34px rgba(0,0,0,0.28), 0 3px 10px rgba(0,0,0,0.18)",
            padding: 5,
            maxHeight: maxMenuHeight,
            overflowY: "auto",
          }}
        >
          {options.map((o) => {
            const isSel = o.value === value
            return (
              <button
                key={String(o.value)}
                type="button"
                role="option"
                aria-selected={isSel}
                disabled={o.disabled}
                onClick={() => { if (!o.disabled) { onChange(o.value); setOpen(false) } }}
                onMouseEnter={(e) => { if (!isSel && !o.disabled) e.currentTarget.style.backgroundColor = c.optionHover }}
                onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.backgroundColor = "transparent" }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "7px 9px",
                  border: "none",
                  borderRadius: 7,
                  textAlign: "left",
                  fontSize: s.fontSize,
                  fontWeight: 500,
                  cursor: o.disabled ? "not-allowed" : "pointer",
                  opacity: o.disabled ? 0.5 : 1,
                  backgroundColor: isSel ? c.selectedBg : "transparent",
                  color: isSel ? c.selectedText : c.optionText,
                  transition: "background-color 0.12s ease-in-out",
                }}
              >
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</span>
                {isSel && <MIcon name="check" size={16} style={{ flexShrink: 0, color: "#2680bf" }} />}
              </button>
            )
          })}
        </motion.div>,
        document.body,
      )}
    </div>
  )
}
