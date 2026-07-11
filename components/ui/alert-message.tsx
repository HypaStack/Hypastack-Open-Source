"use client"

import type { CSSProperties, ReactNode } from "react"
import { useThemeMode, type ThemeMode } from "./use-theme-mode"

type AlertTone = "error" | "success" | "warning" | "info"

interface AlertMessageProps {
  children: ReactNode
  tone?: AlertTone
  /** "auto" follows the app's dark class / prefers-color-scheme. */
  theme?: ThemeMode
  /** Replace the default tone icon, or pass null to drop it. */
  icon?: ReactNode | null
  /** Base rgb triplet — overrides the tone palette. */
  rgb?: string
  /** Fade + de-blur on mount. */
  animate?: boolean
  className?: string
  /** Merged last, so it can override any inline style. */
  style?: CSSProperties
  role?: "alert" | "status"
}

const TONE_RGB: Record<AlertTone, string> = {
  error: "239, 68, 68",
  success: "34, 197, 94",
  warning: "234, 179, 8",
  info: "59, 130, 246",
}

const TONE_TEXT: Record<"dark" | "light", Record<AlertTone, string>> = {
  dark: {
    error: "rgb(254, 202, 202)",
    success: "rgb(187, 247, 208)",
    warning: "rgb(254, 240, 138)",
    info: "rgb(191, 219, 254)",
  },
  light: {
    error: "rgb(153, 27, 27)",
    success: "rgb(22, 101, 52)",
    warning: "rgb(133, 77, 14)",
    info: "rgb(30, 64, 175)",
  },
}

function CircleAlertIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, marginRight: 8, marginTop: 2 }}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  )
}

/**
 * Inline alert / validation message: tinted fill, matching hairline border, and
 * a blur-up entrance.
 *
 * Portable: all essential styling is inline and the keyframes ship with the
 * component, so no global CSS or Tailwind is required.
 */
export function AlertMessage({
  children,
  tone = "error",
  theme = "auto",
  icon,
  rgb,
  animate = true,
  className,
  style,
  role = "alert",
}: AlertMessageProps) {
  const mode = useThemeMode(theme)
  const base = rgb ?? TONE_RGB[tone]
  const showIcon = icon === undefined ? <CircleAlertIcon /> : icon

  return (
    <>
      <style>{`@keyframes hs-blur-up{from{opacity:0;filter:blur(6px);transform:translateY(6px)}to{opacity:1;filter:blur(0);transform:none}}`}</style>
      <div
        role={role}
        className={className}
        style={{
          display: "flex",
          alignItems: "flex-start",
          boxSizing: "border-box",
          marginBottom: 8,
          padding: 8,
          borderRadius: 8,
          border: `0.7px solid rgba(${base}, 0.3)`,
          backgroundColor: `rgba(${base}, ${mode === "dark" ? 0.2 : 0.12})`,
          color: rgb ? "inherit" : TONE_TEXT[mode][tone],
          fontSize: 14,
          lineHeight: "20px",
          ...(animate ? { opacity: 0, animation: "hs-blur-up 0.5s ease forwards" } : {}),
          ...style,
        }}
      >
        {showIcon}
        <span>{children}</span>
      </div>
    </>
  )
}
