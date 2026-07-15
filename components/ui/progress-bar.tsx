"use client"

import type { CSSProperties } from "react"
import { useThemeMode, type ThemeMode } from "./use-theme-mode"

interface ProgressBarProps {
  /** Fill amount, 0–100. Clamped. */
  value: number
  /** Track height in px. */
  height?: number
  /** Fill colour + hover-free gloss. Defaults to the app indigo. */
  color?: string
  /** "auto" follows the app's dark class / prefers-color-scheme (track only). */
  theme?: ThemeMode
  /** Additive — safe for layout tweaks. */
  className?: string
  /** Merged last, so it can override any inline style. */
  style?: CSSProperties
  "aria-label"?: string
}

/**
 * Progress bar with the same "shine" gloss as ShineButton / ToggleSwitch: a
 * recessed track and an indigo fill with a top-down sheen, hairline top edge and
 * inset bottom shadow. The fill colour is fixed (no usage-based recolouring).
 *
 * Portable: all essential styling is inline, so no global CSS is required.
 */
export function ProgressBar({
  value,
  height = 6,
  color = "#2680bf",
  theme = "auto",
  className,
  style,
  "aria-label": ariaLabel,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value))
  const track = useThemeMode(theme) === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={className}
      style={{
        position: "relative",
        boxSizing: "border-box",
        width: "100%",
        height,
        borderRadius: 9999,
        overflow: "hidden",
        backgroundColor: track,
        boxShadow: "rgba(0,0,0,0.25) 0px 1px 1px 0px inset",
        ...style,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          minWidth: pct > 0 ? height : 0,
          borderRadius: 9999,
          backgroundColor: color,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.18), rgba(255,255,255,0))",
          borderTop: "0.7px solid rgba(255,255,255,0.4)",
          boxShadow: "#195a87 0px -1px 0px 0px inset",
          transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
    </div>
  )
}
