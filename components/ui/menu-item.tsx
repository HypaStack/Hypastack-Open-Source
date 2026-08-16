"use client"

import type { CSSProperties, ReactNode, MouseEventHandler, ElementType } from "react"
import { menuItemVariants } from "@heroui/react"

interface MenuItemProps {
  children: ReactNode
  /** Leading icon node, rendered at the row's icon colour. */
  icon?: ReactNode
  /** Trailing node (shortcut hint, chevron, badge). */
  trailing?: ReactNode
  /** Red text + red hover fill, for destructive rows. */
  danger?: boolean
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
 * Full-width row for dropdown / popover menus — HeroUI's real `.menu-item`
 * class (the same styling `Menu.Item` uses internally), on a plain
 * button/link since these rows are used standalone outside a Menu/ListBox
 * collection.
 */
export function MenuItem({
  children,
  icon,
  trailing,
  danger = false,
  href,
  as: Link = "a",
  onClick,
  disabled = false,
  className,
  style,
  role = "menuitem",
}: MenuItemProps) {
  const classes = [menuItemVariants(), "text-left no-underline", className].filter(Boolean).join(" ")
  const dangerStyle: CSSProperties = danger ? { color: "var(--danger)" } : {}

  const inner = (
    <>
      {icon && <span style={{ display: "flex", flexShrink: 0 }}>{icon}</span>}
      <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
      {trailing && <span style={{ display: "flex", flexShrink: 0 }}>{trailing}</span>}
    </>
  )

  const shared = { className: classes, style: { ...dangerStyle, ...style }, role }

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
