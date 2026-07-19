"use client"

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "motion/react"
import { useThemeMode, type ThemeMode } from "./use-theme-mode"

export type TooltipPlacement = "top" | "right" | "bottom" | "left"

const PALETTE = {
  dark: { bg: "#2c2c30", text: "#f0f0f0" },
  light: { bg: "#171717", text: "#f7f8f8" },
} as const

const ARROW = 5

interface TooltipProps {
  /** Tooltip body. Nothing renders when this is empty. */
  content: ReactNode
  /** Side of the trigger the tooltip sits on. */
  placement?: TooltipPlacement
  /** Hover dwell before it appears, in ms. */
  delay?: number
  /** Gap between the trigger and the tooltip, in px. */
  offset?: number
  /** "auto" follows the app's dark class / prefers-color-scheme. */
  theme?: ThemeMode
  disabled?: boolean
  /** Wrapper display — inline-flex suits buttons, block suits full-width rows. */
  display?: CSSProperties["display"]
  children: ReactNode
}

interface Coords {
  left: number
  top: number
  transform: string
}

function place(rect: DOMRect, placement: TooltipPlacement, offset: number): Coords {
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  switch (placement) {
    case "top":
      return { left: cx, top: rect.top - offset, transform: "translate(-50%, -100%)" }
    case "bottom":
      return { left: cx, top: rect.bottom + offset, transform: "translate(-50%, 0)" }
    case "left":
      return { left: rect.left - offset, top: cy, transform: "translate(-100%, -50%)" }
    default:
      return { left: rect.right + offset, top: cy, transform: "translate(0, -50%)" }
  }
}

function arrowStyle(placement: TooltipPlacement, bg: string): CSSProperties {
  const base: CSSProperties = {
    position: "absolute",
    width: ARROW * 2,
    height: ARROW * 2,
    backgroundColor: bg,
    transform: "rotate(45deg)",
  }
  switch (placement) {
    case "top":
      return { ...base, bottom: -ARROW, left: "50%", marginLeft: -ARROW }
    case "bottom":
      return { ...base, top: -ARROW, left: "50%", marginLeft: -ARROW }
    case "left":
      return { ...base, right: -ARROW, top: "50%", marginTop: -ARROW }
    default:
      return { ...base, left: -ARROW, top: "50%", marginTop: -ARROW }
  }
}

// Slide a couple of px out of the trigger as it fades in.
function enterOffset(placement: TooltipPlacement): { x: number; y: number } {
  switch (placement) {
    case "top":
      return { x: 0, y: 4 }
    case "bottom":
      return { x: 0, y: -4 }
    case "left":
      return { x: 4, y: 0 }
    default:
      return { x: -4, y: 0 }
  }
}

/**
 * Hover tooltip with an arrow pointing at its trigger.
 *
 * Portals to <body> with fixed coords taken from the trigger's rect, so it is
 * never clipped by an ancestor's overflow or trapped in its stacking context.
 */
export function Tooltip({
  content,
  placement = "right",
  delay = 120,
  offset = 10,
  theme = "auto",
  disabled = false,
  display = "block",
  children,
}: TooltipProps) {
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState<Coords | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const c = PALETTE[useThemeMode(theme)]

  useEffect(() => setMounted(true), [])

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setCoords(null)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  // Fixed coords go stale the moment anything moves underneath.
  useEffect(() => {
    if (!coords) return
    window.addEventListener("scroll", hide, true)
    window.addEventListener("resize", hide)
    return () => {
      window.removeEventListener("scroll", hide, true)
      window.removeEventListener("resize", hide)
    }
  }, [coords])

  const show = () => {
    if (disabled || !content) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const el = triggerRef.current
      if (!el) return
      setCoords(place(el.getBoundingClientRect(), placement, offset))
    }, delay)
  }

  const from = enterOffset(placement)

  return (
    <>
      <span
        ref={triggerRef}
        style={{ display }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onPointerDown={hide}
      >
        {children}
      </span>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {coords && (
              <motion.div
                key="tooltip"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
                style={{
                  position: "fixed",
                  left: coords.left,
                  top: coords.top,
                  transform: coords.transform,
                  zIndex: 200,
                  pointerEvents: "none",
                }}
              >
                <motion.div
                  role="tooltip"
                  initial={{ x: from.x, y: from.y }}
                  animate={{ x: 0, y: 0 }}
                  exit={{ x: from.x, y: from.y }}
                  transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
                  style={{
                    position: "relative",
                    backgroundColor: c.bg,
                    color: c.text,
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: 500,
                    lineHeight: "16px",
                    whiteSpace: "nowrap",
                    boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
                  }}
                >
                  <span style={arrowStyle(placement, c.bg)} />
                  <span style={{ position: "relative" }}>{content}</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}
