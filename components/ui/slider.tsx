"use client"

import type { CSSProperties } from "react"
import { Slider as HeroSlider } from "@heroui/react"

interface SliderProps {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  disabled?: boolean
  className?: string
  style?: CSSProperties
  "aria-label"?: string
}

/** Range slider — HeroUI's real Slider, single-thumb, native keyboard/drag a11y. */
export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  disabled = false,
  className,
  style,
  "aria-label": ariaLabel,
}: SliderProps) {
  return (
    <HeroSlider
      value={value}
      minValue={min}
      maxValue={max}
      step={step}
      onChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      isDisabled={disabled}
      aria-label={ariaLabel}
      className={className}
      style={style}
    >
      <HeroSlider.Track>
        <HeroSlider.Fill />
        <HeroSlider.Thumb />
      </HeroSlider.Track>
    </HeroSlider>
  )
}
