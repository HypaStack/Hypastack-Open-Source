"use client"

import type { ElementType, ReactNode, MouseEventHandler, CSSProperties } from "react"
import { buttonVariants, type ButtonVariants } from "@heroui/react"

interface ButtonLinkProps extends ButtonVariants {
  href: string
  /** Link component to render, e.g. next/link. Defaults to a plain <a>. */
  as?: ElementType
  children: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: MouseEventHandler
  target?: string
  rel?: string
  title?: string
  "aria-label"?: string
}

/**
 * HeroUI's Button (react-aria-components) can't render as an anchor, so
 * navigational buttons need their own element. This applies HeroUI's real
 * `buttonVariants()` classes, the same ones `<Button>` uses internally, to a
 * Link element. No styling of its own; purely a DOM-element bridge.
 */
export function ButtonLink({
  href,
  as: Link = "a",
  children,
  className,
  style,
  onClick,
  target,
  rel,
  title,
  "aria-label": ariaLabel,
  variant,
  size,
  isIconOnly,
  fullWidth,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      className={[buttonVariants({ variant, size, isIconOnly, fullWidth }), className].filter(Boolean).join(" ")}
      style={style}
    >
      {children}
    </Link>
  )
}
