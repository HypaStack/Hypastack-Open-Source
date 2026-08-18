"use client"
import React from "react"

export interface MaterialIconProps {
  name: string
  className?: string
  style?: React.CSSProperties
  size?: number | string
  strokeWidth?: number // ignored, kept for Lucide compat
}

// Renders Material Symbols Rounded, accepts className/style/size like Lucide for a near-drop-in.
export function MIcon({ name, className = "", style, size }: MaterialIconProps) {
  // +2 px nudge makes every icon slightly larger site-wide without editing call-sites
  const adjusted = typeof size === "number" ? size + 2 : size
  const sizeStyle = adjusted
    ? { fontSize: typeof adjusted === "number" ? `${adjusted}px` : adjusted }
    : {}
  return (
    <span
      className={`material-symbols-rounded ${className}`}
      style={{ ...sizeStyle, ...style }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
