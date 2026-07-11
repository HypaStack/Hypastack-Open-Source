"use client"

import { useState, type CSSProperties, type ReactNode, type MouseEventHandler, type ElementType } from "react"
import { useThemeMode, type ThemeMode } from "./use-theme-mode"

const PALETTE = {
  dark: {
    text: "#cccccc",
    hoverText: "#f7f8f8",
    icon: "#888888",
    hoverBg: "rgba(255,255,255,0.06)",
    dangerText: "#f87171",
    dangerHoverBg: "rgba(239,68,68,0.12)",
  },
  light: {
    text: "#333333",
    hoverText: "#171717",
    icon: "#666666",
    hoverBg: "#f4f4f4",
    dangerText: "#dc2626",
    dangerHoverBg: "rgba(239,68,68,0.08)",
  },
} as const

interface MenuItemProps {
  children: ReactNode
  /** Leading icon node, rendered at the row's icon colour. */
  icon?: ReactNode
  /** Trailing node (shortcut hint, chevron, badge). */
  trailing?: ReactNode
  /** Red text + red hover fill, for destructive rows. */
  danger?: boolean
  /** "auto" follows the app's dark class / prefers-color-scheme. */
  theme?: ThemeMode
  href?: string
  /** Link component to render for `href` — e.g. next/link. Defaults to a plain <a>. */
  as?: ElementType
  onClick?: MouseEventHandler
  disabled?: boolean
  className?: string
  /** Merged last, so it can override any inline style. */
  style?: CSSProperties
  role?: string
}

/**
 * Full-width row for dropdown / popover menus: transparent until hovered, icon
 * on the left, label flush beside it. Not a button chrome — deliberately flat.
 *
 * Portable: all essential styling is inline and hover is handled in JS, so no
 * global CSS is required.
 */
export function MenuItem({
  children,
  icon,
  trailing,
  danger = false,
  theme = "auto",
  href,
  as: Link = "a",
  onClick,
  disabled = false,
  className,
  style,
  role = "menuitem",
}: MenuItemProps) {
  const [hover, setHover] = useState(false)
  const c = PALETTE[useThemeMode(theme)]
  const hovered = hover && !disabled

  const css: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    boxSizing: "border-box",
    width: "100%",
    padding: "8px 10px",
    border: "none",
    borderRadius: 6,
    background: hovered ? (danger ? c.dangerHoverBg : c.hoverBg) : "transparent",
    color: danger ? c.dangerText : hovered ? c.hoverText : c.text,
    fontSize: 14,
    fontWeight: 500,
    textAlign: "left",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "background-color 0.15s ease-in-out, color 0.15s ease-in-out",
    WebkitTapHighlightColor: "transparent",
    ...style,
  }

  const inner = (
    <>
      {icon && (
        <span style={{ display: "flex", flexShrink: 0, color: danger ? "inherit" : hovered ? c.hoverText : c.icon }}>
          {icon}
        </span>
      )}
      <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
      {trailing && <span style={{ display: "flex", flexShrink: 0 }}>{trailing}</span>}
    </>
  )

  const shared = {
    className,
    style: css,
    role,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
  }

  if (href && !disabled) {
    return (
      <Link href={href} onClick={onClick} {...shared}>
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" disabled={disabled} onClick={onClick} {...shared}>
      {inner}
    </button>
  )
}
