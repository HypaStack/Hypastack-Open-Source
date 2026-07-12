"use client"
import React from "react"
import { ICON_CODEPOINTS } from "@/constants/icon-codepoints"

export interface MaterialIconProps {
  name: string
  className?: string
  style?: React.CSSProperties
  size?: number | string
  strokeWidth?: number // ignored — kept for Lucide compat
}

/**
 * Wrapper around Google Material Symbols (Rounded).
 *
 * Renders a `<span class="material-symbols-rounded">` with the icon's
 * codepoint character — not its ligature name — because the shipped font is a
 * subset (see scripts/subset-icons.mjs) and ligatures can't be subset. A name
 * missing from the map means the subset is stale: re-run
 * `node scripts/subset-icons.mjs`.
 */
export function MIcon({ name, className = "", style, size }: MaterialIconProps) {
  const char = ICON_CODEPOINTS[name]
  if (char === undefined && process.env.NODE_ENV === "development") {
    console.warn(`[MIcon] "${name}" is not in the icon subset — run: node scripts/subset-icons.mjs`)
  }
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
      {char ?? ""}
    </span>
  )
}
