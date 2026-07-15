"use client"

import { useState, type CSSProperties, type ReactNode, type MouseEventHandler, type ElementType } from "react"
import { useThemeMode, type ThemeMode } from "./use-theme-mode"
import { BUTTON_SIZES, type ButtonSize } from "./button-sizes"

const SUBTLE = {
  dark: { text: "#f7f8f8", bg: "rgba(255,255,255,0.06)", hoverBg: "rgba(255,255,255,0.1)" },
  light: { text: "#171717", bg: "rgba(0,0,0,0.05)", hoverBg: "rgba(0,0,0,0.09)" },
} as const

interface ShineButtonProps {
  children: ReactNode
  /** "primary" = glossy raised shine button; "subtle" = translucent neutral. */
  variant?: "primary" | "subtle"
  /** "auto" follows the app's dark class / prefers-color-scheme. Affects "subtle" only. */
  theme?: ThemeMode
  size?: ButtonSize
  /** Square the button and drop the horizontal padding (icon-only triggers). */
  iconOnly?: boolean
  /** Render as a link when set, otherwise a <button>. */
  href?: string
  /** Link component to render for `href` — e.g. next/link. Defaults to a plain <a>. */
  as?: ElementType
  onClick?: MouseEventHandler
  type?: "button" | "submit" | "reset"
  disabled?: boolean
  fullWidth?: boolean
  /** Primary fill colour + hover colour. */
  color?: string
  hoverColor?: string
  /** Additive — safe for layout tweaks. Never needed for core visuals. */
  className?: string
  /** Merged last, so it can override any inline style. */
  style?: CSSProperties
  target?: string
  rel?: string
  "aria-label"?: string
}

/**
 * Self-contained button/link with a "shine" gloss (top-down sheen + hairline top
 * highlight + layered depth shadow with inset bottom edge).
 *
 * Portable: all essential styling is inline (works with or without Tailwind) and
 * hover is handled in JS, so no global CSS is required. `className`/`style` are
 * purely additive/override.
 */
export function ShineButton({
  children,
  variant = "primary",
  theme = "auto",
  size = "lg",
  iconOnly = false,
  href,
  as: Link = "a",
  onClick,
  type = "button",
  disabled = false,
  fullWidth = false,
  color = "#2680bf",
  hoverColor = "#1f6ba0",
  className,
  style,
  target,
  rel,
  "aria-label": ariaLabel,
}: ShineButtonProps) {
  const [hover, setHover] = useState(false)
  const primary = variant === "primary"
  const hovered = hover && !disabled
  const sub = SUBTLE[useThemeMode(theme)]
  const s = BUTTON_SIZES[size]

  const css: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    flexShrink: 0,
    height: s.height,
    width: iconOnly ? s.height : fullWidth ? "100%" : "auto",
    padding: iconOnly ? 0 : `0 ${s.padding}px`,
    borderRadius: s.radius,
    border: "none",
    fontSize: s.fontSize,
    fontWeight: 500,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    ...(primary
      ? {
          color: "#ffffff",
          backgroundColor: hovered ? hoverColor : color,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.12), rgba(255,255,255,0))",
          borderTop: "1px solid rgba(255,255,255,0.6)",
          boxShadow:
            "rgba(0,0,0,0.05) 0px 1px 0px 0px, rgba(0,0,0,0.1) 0px 4px 4px 0px, rgba(0,0,0,0.15) 0px 10px 10px 0px, rgba(0,0,0,0.4) 0px -2px 0px 0px inset",
          transition: "all 0.5s cubic-bezier(0.4,0,0.2,1)",
        }
      : {
          color: sub.text,
          backgroundColor: hovered ? sub.hoverBg : sub.bg,
          transition: "background-color 0.2s ease-in-out",
        }),
    ...style,
  }

  const shared = {
    className,
    style: css,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    "aria-label": ariaLabel,
  }

  if (href && !disabled) {
    return (
      <Link href={href} target={target} rel={rel} onClick={onClick} {...shared}>
        {children}
      </Link>
    )
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} {...shared}>
      {children}
    </button>
  )
}
