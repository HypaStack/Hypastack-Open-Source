"use client"

import type { CSSProperties } from "react"
import { Switch } from "@heroui/react"

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
  className?: string
  /** Merged last, so it can override any inline style (incl. width/height/colors). */
  style?: CSSProperties
  id?: string
  "aria-label"?: string
  "aria-labelledby"?: string
}

/**
 * Pill toggle with Hypastack's "shine" gloss, built on HeroUI's Switch (real
 * checkbox semantics, keyboard support, focus ring) with the track/thumb geometry
 * driven by CSS variables so width/height/colors stay fully customizable per call site.
 */
export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  width = 48,
  height = 28,
  activeColor = "#2680bf",
  inactiveColor = "rgba(255,255,255,0.14)",
  className,
  style,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
}: ToggleSwitchProps) {
  const gap = Math.max(2, Math.round(height * 0.11))
  const knob = height - gap * 2
  const travel = width - knob - gap * 2

  return (
    <Switch
      isSelected={checked}
      onChange={onChange}
      isDisabled={disabled}
      id={id}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      className={className}
      style={
        {
          "--ts-width": `${width}px`,
          "--ts-height": `${height}px`,
          "--ts-gap": `${gap}px`,
          "--ts-knob": `${knob}px`,
          "--ts-travel": `${travel}px`,
          "--ts-active": activeColor,
          "--ts-inactive": inactiveColor,
          ...style,
        } as CSSProperties
      }
    >
      <Switch.Content className="!p-0">
        <Switch.Control
          className="relative box-border shrink-0 border-none border-t-[0.7px] border-t-white/30 rounded-full cursor-pointer
            data-disabled:cursor-not-allowed data-disabled:opacity-50
            transition-[background-color] duration-300 ease-in-out
            [-webkit-tap-highlight-color:transparent]"
          style={{
            width: "var(--ts-width)",
            height: "var(--ts-height)",
            backgroundColor: checked ? activeColor : inactiveColor,
            backgroundImage: "linear-gradient(rgba(255,255,255,0.10), rgba(255,255,255,0))",
            boxShadow: checked
              ? "rgba(0,0,0,0.1) 0px 3px 6px 0px, #195a87 0px -1px 0px 0px inset"
              : "rgba(0,0,0,0.1) 0px 3px 6px 0px, rgba(0,0,0,0.3) 0px -1px 0px 0px inset",
          }}
        >
          <Switch.Thumb
            aria-hidden="true"
            className="absolute top-1/2 pointer-events-none transition-[transform,background-color] duration-300"
            style={{
              left: "var(--ts-gap)",
              width: "var(--ts-knob)",
              height: "var(--ts-knob)",
              borderRadius: 9999,
              backgroundColor: checked ? "#ffffff" : "rgba(255,255,255,0.4)",
              transform: `translate(${checked ? travel : 0}px, calc(-50% - 1px))`,
              transitionTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.35)",
            }}
          />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  )
}
