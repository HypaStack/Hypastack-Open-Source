"use client"

import { Loader } from "./loader"

interface LoadingSvgProps {
  /** Diameter of the spinner in px. */
  size?: number
  /**
   * "theme" inherits the surrounding text colour (currentColor); "white"/"dark"
   * force a mark for fixed-background pages.
   */
  variant?: "theme" | "white" | "dark"
  className?: string
}

// Thin adapter kept so existing call sites keep working: every loader in the app
// now renders the single ldrs line-spinner (see components/ui/loader.tsx).
export function LoadingSvg({ size = 28, variant = "theme", className = "" }: LoadingSvgProps) {
  const color = variant === "white" ? "#f7f8f8" : variant === "dark" ? "#171717" : "currentColor"
  return (
    <span className={`inline-flex items-center justify-center ${className}`.trim()} aria-label="Loading">
      <Loader size={size} color={color} />
    </span>
  )
}
