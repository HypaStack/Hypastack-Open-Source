"use client"

import type { CSSProperties, ReactNode } from "react"
import { Checkbox } from "@heroui/react"

interface CheckmarkProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Optional label rendered beside the box. */
  children?: ReactNode
  /** Box side length in px. */
  size?: number
  disabled?: boolean
  className?: string
  style?: CSSProperties
  "aria-label"?: string
}

/** Checkbox — HeroUI's real Checkbox, sized to an exact px box. */
export function Checkmark({
  checked,
  onChange,
  children,
  size = 18,
  disabled = false,
  className,
  style,
  "aria-label": ariaLabel,
}: CheckmarkProps) {
  return (
    <Checkbox
      isSelected={checked}
      onChange={onChange}
      isDisabled={disabled}
      aria-label={ariaLabel}
      className={className}
      style={style}
    >
      <Checkbox.Content className="!gap-3">
        <Checkbox.Control style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }}>
          <Checkbox.Indicator />
        </Checkbox.Control>
        {children}
      </Checkbox.Content>
    </Checkbox>
  )
}
