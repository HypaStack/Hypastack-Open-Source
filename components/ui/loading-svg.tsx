"use client"

import type { CSSProperties } from "react"

// Animated loading marks hosted on the CDN. The dark mark reads on light
// backgrounds, the white mark reads on dark ones.
const DARK_LOADING = "https://r2.hypastack.com/cdn/vdqawt9avijr/dark-loading.svg"
const WHITE_LOADING = "https://r2.hypastack.com/cdn/rzhuk901nk6k/white-loading.svg"

// The source artwork frames the mark inside a large empty canvas (the mark is
// only ~14% of the SVG). We render the image several times bigger than the
// visible box and clip the surrounding padding, so the mark itself fills `size`.
const FILL = 5.5

interface LoadingSvgProps {
  /** Size of the visible mark in px (square). */
  size?: number
  /**
   * "theme" swaps by the dashboard's light/dark class. "white"/"dark" force a
   * single mark — use those on fixed-background pages where no theme class is set.
   */
  variant?: "theme" | "white" | "dark"
  className?: string
}

export function LoadingSvg({ size = 48, variant = "theme", className = "" }: LoadingSvgProps) {
  const box: CSSProperties = {
    width: size,
    height: size,
    overflow: "hidden",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  }
  const imgStyle: CSSProperties = { height: size * FILL, width: "auto", maxWidth: "none", flexShrink: 0 }
  const base = "select-none pointer-events-none"

  if (variant !== "theme") {
    return (
      <span style={box} className={className} aria-label="Loading">
        <img src={variant === "white" ? WHITE_LOADING : DARK_LOADING} alt="Loading" draggable={false} style={imgStyle} className={base} />
      </span>
    )
  }

  return (
    <span style={box} className={className} aria-label="Loading">
      <img src={DARK_LOADING} alt="Loading" draggable={false} style={imgStyle} className={`${base} dark:hidden`} />
      <img src={WHITE_LOADING} alt="" aria-hidden="true" draggable={false} style={imgStyle} className={`${base} hidden dark:block`} />
    </span>
  )
}
