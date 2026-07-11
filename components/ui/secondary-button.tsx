"use client"

import { useState, type CSSProperties, type ReactNode, type MouseEventHandler, type ElementType } from "react"
import { useThemeMode, type ThemeMode } from "./use-theme-mode"
import { BUTTON_SIZES, type ButtonSize } from "./button-sizes"

const PALETTE = {
  dark: {
    bg: "rgba(38,38,38,0.7)",
    hoverBg: "rgba(115,115,115,0.3)",
    text: "rgb(245,245,245)",
    hoverText: "#ffffff",
    dangerBg: "rgba(239,68,68,0.12)",
    dangerHoverBg: "rgba(239,68,68,0.22)",
    dangerText: "#f87171",
    topEdge: "rgba(255,255,255,0.3)",
    sheen: "linear-gradient(rgba(255,255,255,0.1), rgba(255,255,255,0))",
    shadow:
      "rgba(0,0,0,0.05) 0px 1px 0px 0px, rgba(0,0,0,0.1) 0px 4px 4px 0px, rgba(0,0,0,0.15) 0px 10px 10px 0px, rgba(0,0,0,0.1) 0px -1px 0px 0px inset",
  },
  light: {
    bg: "rgba(0,0,0,0.05)",
    hoverBg: "rgba(0,0,0,0.09)",
    text: "#171717",
    hoverText: "#000000",
    dangerBg: "rgba(239,68,68,0.08)",
    dangerHoverBg: "rgba(239,68,68,0.16)",
    dangerText: "#dc2626",
    topEdge: "rgba(255,255,255,0.9)",
    sheen: "linear-gradient(rgba(255,255,255,0.7), rgba(255,255,255,0))",
    shadow:
      "rgba(0,0,0,0.04) 0px 1px 0px 0px, rgba(0,0,0,0.06) 0px 4px 4px 0px, rgba(0,0,0,0.08) 0px 10px 10px 0px, rgba(0,0,0,0.06) 0px -1px 0px 0px inset",
  },
} as const

interface SecondaryButtonProps {
  children: ReactNode
  /** "solid" = frosted glass with shine; "ghost" = transparent until hovered. */
  variant?: "solid" | "ghost"
  /** Red text + red fill, for destructive actions. */
  danger?: boolean
  /** "auto" follows the app's dark class / prefers-color-scheme. */
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
  /** Resting fill + hover fill. Overrides the theme palette. */
  color?: string
  hoverColor?: string
  /** Additive — safe for layout tweaks. Never needed for core visuals. */
  className?: string
  /** Merged last, so it can override any inline style. */
  style?: CSSProperties
  target?: string
  rel?: string
  title?: string
  "aria-label"?: string
}

/**
 * Secondary CTA ("Learn more", "Start trial") to sit beside a primary
 * ShineButton: frosted neutral fill with the same shine gloss — top-down sheen,
 * hairline top edge, layered depth shadow with an inset bottom.
 *
 * Portable: all essential styling is inline (works with or without Tailwind) and
 * hover is handled in JS, so no global CSS is required.
 */
export function SecondaryButton({
  children,
  variant = "solid",
  danger = false,
  theme = "auto",
  size = "md",
  iconOnly = false,
  href,
  as: Link = "a",
  onClick,
  type = "button",
  disabled = false,
  fullWidth = false,
  color,
  hoverColor,
  className,
  style,
  target,
  rel,
  title,
  "aria-label": ariaLabel,
}: SecondaryButtonProps) {
  const [hover, setHover] = useState(false)
  const hovered = hover && !disabled
  const s = BUTTON_SIZES[size]
  const c = PALETTE[useThemeMode(theme)]
  const ghost = variant === "ghost"

  const restBg = color ?? (danger ? (ghost ? "transparent" : c.dangerBg) : ghost ? "transparent" : c.bg)
  const hoverBg = hoverColor ?? (danger ? c.dangerHoverBg : c.hoverBg)
  const fg = danger ? c.dangerText : hovered ? c.hoverText : c.text

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
    borderTop: "0.7px solid transparent",
    borderRight: "none",
    borderBottom: "none",
    borderLeft: "none",
    fontSize: s.fontSize,
    fontWeight: 500,
    textAlign: "center",
    textDecoration: "none",
    color: fg,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    ...(ghost
      ? {
          backgroundColor: hovered ? hoverBg : restBg,
          transition: "background-color 0.15s ease-in-out, color 0.15s ease-in-out, border-top-color 0.15s ease-in-out",
        }
      : {
          borderTop: `0.7px solid ${c.topEdge}`,
          backgroundColor: hovered ? hoverBg : restBg,
          backgroundImage: c.sheen,
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          boxShadow: c.shadow,
          transition: "all 0.5s cubic-bezier(0.4,0,0.2,1)",
        }),
    ...style,
  }

  const shared = {
    className,
    style: css,
    title,
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
