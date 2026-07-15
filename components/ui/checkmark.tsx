"use client"

import { useState, type CSSProperties, type ReactNode } from "react"
import { useThemeMode, type ThemeMode } from "./use-theme-mode"
import { MIcon } from "@/components/ui/material-icon"

const PALETTE = {
  dark: {
    bg: "rgba(38,38,38,0.7)",
    hoverBg: "rgba(115,115,115,0.3)",
    topEdge: "rgba(255,255,255,0.3)",
    sheen: "linear-gradient(rgba(255,255,255,0.1), rgba(255,255,255,0))",
    shadow:
      "rgba(0,0,0,0.05) 0px 1px 0px 0px, rgba(0,0,0,0.1) 0px 4px 4px 0px, rgba(0,0,0,0.15) 0px 10px 10px 0px, rgba(0,0,0,0.1) 0px -1px 0px 0px inset",
  },
  light: {
    bg: "rgba(0,0,0,0.05)",
    hoverBg: "rgba(0,0,0,0.09)",
    topEdge: "rgba(255,255,255,0.9)",
    sheen: "linear-gradient(rgba(255,255,255,0.7), rgba(255,255,255,0))",
    shadow:
      "rgba(0,0,0,0.04) 0px 1px 0px 0px, rgba(0,0,0,0.06) 0px 4px 4px 0px, rgba(0,0,0,0.08) 0px 10px 10px 0px, rgba(0,0,0,0.06) 0px -1px 0px 0px inset",
  },
} as const

/** Blue checked fill — matches ShineButton's primary gloss. */
const CHECKED = {
  bg: "#2680bf",
  sheen: "linear-gradient(rgba(255,255,255,0.12), rgba(255,255,255,0))",
  topEdge: "rgba(255,255,255,0.6)",
} as const

interface CheckmarkProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Optional label rendered beside the box. */
  children?: ReactNode
  /** Box side length in px. */
  size?: number
  disabled?: boolean
  /** "auto" follows the app's dark class / prefers-color-scheme. */
  theme?: ThemeMode
  /** Additive — safe for layout tweaks. */
  className?: string
  style?: CSSProperties
  "aria-label"?: string
}

/**
 * Custom checkbox with the same frosted-glass shine as SecondaryButton — top-down
 * sheen, hairline top edge, layered depth shadow. Fills solid on check.
 *
 * Portable: all essential styling is inline and hover is handled in JS, so no
 * global CSS is required.
 */
export function Checkmark({
  checked,
  onChange,
  children,
  size = 18,
  disabled = false,
  theme = "auto",
  className,
  style,
  "aria-label": ariaLabel,
}: CheckmarkProps) {
  const [hover, setHover] = useState(false)
  const hovered = hover && !disabled
  const c = PALETTE[useThemeMode(theme)]

  const box: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    flexShrink: 0,
    height: size,
    width: size,
    borderRadius: Math.round(size * 0.28),
    border: "none",
    borderTop: `${checked ? "1px" : "0.7px"} solid ${checked ? CHECKED.topEdge : c.topEdge}`,
    backgroundColor: checked ? CHECKED.bg : hovered ? c.hoverBg : c.bg,
    backgroundImage: checked ? CHECKED.sheen : c.sheen,
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    boxShadow: c.shadow,
    color: "#ffffff",
    transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
  }

  return (
    <label
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={ariaLabel}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
      />
      <span style={box}>
        <MIcon
          name="check"
          size={Math.round(size * 0.72)}
          style={{ opacity: checked ? 1 : 0, transition: "opacity 0.15s ease" }}
        />
      </span>
      {children}
    </label>
  )
}
