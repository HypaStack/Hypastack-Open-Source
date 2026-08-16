"use client"

import type { CSSProperties } from "react"
import { ProgressBar as HeroProgressBar } from "@heroui/react"

interface ProgressBarProps {
  /** Fill amount, 0–100. Clamped. */
  value: number
  /** Track height in px. */
  height?: number
  /** Fill colour + hover-free gloss. Defaults to the app indigo. */
  color?: string
  className?: string
  /** Merged last, so it can override any inline style. */
  style?: CSSProperties
  "aria-label"?: string
}

/**
 * Progress bar with the same "shine" gloss as the primary button / ToggleSwitch, built on
 * HeroUI's ProgressBar (real `role="progressbar"` semantics, value clamping).
 */
export function ProgressBar({
  value,
  height = 6,
  color = "#2680bf",
  className,
  style,
  "aria-label": ariaLabel,
}: ProgressBarProps) {
  return (
    <HeroProgressBar value={value} aria-label={ariaLabel} className={className} style={style}>
      <HeroProgressBar.Track
        className="relative box-border w-full overflow-hidden rounded-full bg-[var(--default)]"
        style={{ height, boxShadow: "rgba(0,0,0,0.25) 0px 1px 1px 0px inset" }}
      >
        <HeroProgressBar.Fill
          className="h-full rounded-full border-t-[0.7px] border-t-white/40 transition-[width] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            backgroundColor: color,
            backgroundImage: "linear-gradient(rgba(255,255,255,0.18), rgba(255,255,255,0))",
            boxShadow: "#195a87 0px -1px 0px 0px inset",
          }}
        />
      </HeroProgressBar.Track>
    </HeroProgressBar>
  )
}
