"use client"

import type { CSSProperties, ReactNode } from "react"
import { Tooltip as HeroTooltip } from "@heroui/react"

export type TooltipPlacement = "top" | "right" | "bottom" | "left"

interface TooltipProps {
  /** Tooltip body. Nothing renders when this is empty. */
  content: ReactNode
  /** Side of the trigger the tooltip sits on. */
  placement?: TooltipPlacement
  /** Hover dwell before it appears, in ms. */
  delay?: number
  /** Gap between the trigger and the tooltip, in px. */
  offset?: number
  disabled?: boolean
  /** Wrapper display — inline-flex suits buttons, block suits full-width rows. */
  display?: CSSProperties["display"]
  children: ReactNode
}

/** Hover tooltip with an arrow — HeroUI's real Tooltip (portaled, collision-aware placement). */
export function Tooltip({
  content,
  placement = "right",
  delay = 120,
  offset = 10,
  disabled = false,
  display = "block",
  children,
}: TooltipProps) {
  if (disabled || !content) {
    return <span style={{ display }}>{children}</span>
  }

  return (
    <HeroTooltip delay={delay}>
      <HeroTooltip.Trigger style={{ display }}>{children}</HeroTooltip.Trigger>
      <HeroTooltip.Content placement={placement} offset={offset} showArrow>
        {content}
      </HeroTooltip.Content>
    </HeroTooltip>
  )
}
