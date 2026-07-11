"use client"

import type { CSSProperties } from "react"

interface ToggleSwitchProps {
  /** Controlled on/off state. */
  checked: boolean
  /** Called with the next state when toggled. */
  onChange: (checked: boolean) => void
  disabled?: boolean
  /** Track size in px; the knob size and travel derive from these. */
  width?: number
  height?: number
  /** Track colour when on / off. */
  activeColor?: string
  inactiveColor?: string
  /** Additive — safe for layout tweaks (margin, positioning). Never needed for core visuals. */
  className?: string
  /** Merged last, so it can override any inline style (incl. width/height/colors). */
  style?: CSSProperties
  id?: string
  "aria-label"?: string
  "aria-labelledby"?: string
}

/**
 * Self-contained pill toggle with a "shine" gloss (top-down sheen + hairline top
 * edge + inset bottom). White knob when on, muted-gray when off.
 *
 * Portable: all essential styling is inline, so it renders correctly with or
 * without Tailwind. `className`/`style` are purely additive/override; resize via
 * the `width`/`height` props (knob geometry recalculates automatically).
 */
export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  width = 48,
  height = 28,
  activeColor = "#4f46e5",
  inactiveColor = "rgba(255,255,255,0.14)",
  className,
  style,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
}: ToggleSwitchProps) {
  const gap = Math.max(2, Math.round(height * 0.11)) // ≈3 at 28px
  const knob = height - gap * 2
  const travel = width - knob - gap * 2

  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={className}
      style={{
        position: "relative",
        flexShrink: 0,
        boxSizing: "border-box",
        width,
        height,
        padding: 0,
        border: "none",
        borderTop: "0.7px solid rgba(255,255,255,0.3)",
        borderRadius: 9999,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        backgroundColor: checked ? activeColor : inactiveColor,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.10), rgba(255,255,255,0))",
        boxShadow: "rgba(0,0,0,0.1) 0px 3px 6px 0px, rgba(0,0,0,0.3) 0px -1px 0px 0px inset",
        transition: "background-color 0.3s ease-in-out",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          left: gap,
          width: knob,
          height: knob,
          borderRadius: 9999,
          // white knob on; a gray a touch brighter than the off track when off
          backgroundColor: checked ? "#ffffff" : "rgba(255,255,255,0.4)",
          // −1px lifts the knob to look visually centred against the inset bottom edge
          transform: `translate(${checked ? travel : 0}px, calc(-50% - 1px))`,
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1), background-color 0.3s ease-in-out",
          boxShadow: "0 1px 2px rgba(0,0,0,0.35)",
          pointerEvents: "none",
        }}
      />
    </button>
  )
}
