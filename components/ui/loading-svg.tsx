"use client"

import type { CSSProperties } from "react"

// Animated loading marks hosted on the CDN. The dark mark reads on light
// backgrounds, the white mark reads on dark ones.
const DARK_LOADING = "https://r2.hypastack.com/cdn/vdqawt9avijr/dark-loading.svg"
const WHITE_LOADING = "https://r2.hypastack.com/cdn/rzhuk901nk6k/white-loading.svg"

interface LoadingSvgProps {
  /** Rendered height in px. Width auto-scales to keep the mark's aspect ratio. */
  size?: number
  /**
   * "theme" swaps by the dashboard's light/dark class. "white"/"dark" force a
   * single mark — use those on fixed-background pages where no theme class is set.
   */
  variant?: "theme" | "white" | "dark"
  className?: string
}

export function LoadingSvg({ size = 40, variant = "theme", className = "" }: LoadingSvgProps) {
  const style: CSSProperties = { height: size, width: "auto" }
  const base = "select-none pointer-events-none"

  if (variant !== "theme") {
    return (
      <img
        src={variant === "white" ? WHITE_LOADING : DARK_LOADING}
        alt="Loading"
        draggable={false}
        style={style}
        className={`${base} ${className}`.trim()}
      />
    )
  }

  return (
    <>
      <img src={DARK_LOADING} alt="Loading" draggable={false} style={style} className={`${base} dark:hidden ${className}`.trim()} />
      <img src={WHITE_LOADING} alt="" aria-hidden="true" draggable={false} style={style} className={`${base} hidden dark:block ${className}`.trim()} />
    </>
  )
}
