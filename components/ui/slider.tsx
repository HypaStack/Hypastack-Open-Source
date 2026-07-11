"use client"

import { useId, type CSSProperties } from "react"
import { useThemeMode, type ThemeMode } from "./use-theme-mode"

interface SliderProps {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  disabled?: boolean
  /** "auto" follows the app's dark class / prefers-color-scheme (track only). */
  theme?: ThemeMode
  className?: string
  style?: CSSProperties
  "aria-label"?: string
}

/**
 * Range slider matching the design system: recessed track, an indigo fill that
 * grows from the left, and a glossy white knob (hairline top edge + drop shadow)
 * like the ToggleSwitch. Native <input type=range> underneath for a11y/keyboard.
 *
 * Portable: the thumb/track rules ship in a scoped <style> tag, so no global CSS.
 */
export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  disabled = false,
  theme = "auto",
  className,
  style,
  "aria-label": ariaLabel,
}: SliderProps) {
  const cls = `hs-slider-${useId().replace(/[:]/g, "")}`
  const track = useThemeMode(theme) === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"
  const pct = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0
  const thumb = `width:16px;height:16px;border-radius:9999px;background:#ffffff;border-top:0.7px solid rgba(255,255,255,0.6);box-shadow:0 1px 3px rgba(0,0,0,0.4);cursor:${disabled ? "not-allowed" : "pointer"};`

  return (
    <>
      <style>{`
.${cls}{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:9999px;background:linear-gradient(#4f46e5,#4f46e5) 0/${pct}% 100% no-repeat,${track};box-shadow:inset 0 1px 1px rgba(0,0,0,0.25);outline:none;cursor:${disabled ? "not-allowed" : "pointer"};opacity:${disabled ? 0.5 : 1};}
.${cls}::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;${thumb}}
.${cls}::-moz-range-thumb{border:none;${thumb}}
`}</style>
      <input
        type="range"
        className={[cls, className].filter(Boolean).join(" ")}
        style={style}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </>
  )
}
