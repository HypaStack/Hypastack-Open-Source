"use client"

import type { CSSProperties, ReactNode } from "react"
import { Select, ListBox } from "@heroui/react"
import type { Key } from "react-aria-components"

export interface DropdownOption<T extends string | number = string> {
  value: T
  label: ReactNode
  disabled?: boolean
}

type Size = "sm" | "md"

interface DropdownProps<T extends string | number = string> {
  value: T
  onChange: (value: T) => void
  options: DropdownOption<T>[]
  placeholder?: string
  disabled?: boolean
  fullWidth?: boolean
  size?: Size
  /** Which way the menu opens. */
  direction?: "down" | "up"
  /** Scrollable menu cap in px. */
  maxMenuHeight?: number
  className?: string
  /** Applied to the trigger wrapper (layout tweaks like width). */
  style?: CSSProperties
  "aria-label"?: string
}

/** Select-style dropdown, HeroUI's real Select (portaled popover, native keyboard nav). */
export function Dropdown<T extends string | number = string>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled = false,
  fullWidth = false,
  size = "md",
  direction = "down",
  maxMenuHeight = 260,
  className,
  style,
  "aria-label": ariaLabel,
}: DropdownProps<T>) {
  const selected = options.find((o) => String(o.value) === String(value))
  const height = size === "sm" ? 32 : 40

  return (
    <Select
      selectedKey={value !== undefined ? String(value) : null}
      onSelectionChange={(key: Key | null) => {
        if (key == null) return
        const opt = options.find((o) => String(o.value) === String(key))
        if (opt) onChange(opt.value)
      }}
      isDisabled={disabled}
      fullWidth={fullWidth}
      aria-label={ariaLabel}
      className={className}
      style={{ display: fullWidth ? "block" : "inline-block", ...style }}
    >
      <Select.Trigger style={{ height, fontSize: size === "sm" ? 13 : 14 }}>
        <Select.Value>{selected ? selected.label : placeholder}</Select.Value>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover placement={direction === "up" ? "top" : "bottom"} style={{ maxHeight: maxMenuHeight }}>
        <ListBox items={options}>
          {(o: DropdownOption<T>) => (
            <ListBox.Item key={String(o.value)} id={String(o.value)} isDisabled={o.disabled} textValue={String(o.label)}>
              {o.label}
            </ListBox.Item>
          )}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}
