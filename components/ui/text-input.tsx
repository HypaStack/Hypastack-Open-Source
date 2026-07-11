"use client"

import { useState, forwardRef, type CSSProperties, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react"
import { useThemeMode, type ThemeMode } from "./use-theme-mode"

const PALETTE = {
  dark: {
    // Recessed darker fill + light hairline so the field reads as distinct from
    // any surrounding card/page rather than blending into it.
    bg: "rgba(0,0,0,0.22)",
    border: "rgba(255,255,255,0.1)",
    focusBorder: "rgba(255,255,255,0.3)",
    text: "#ffffff",
    placeholder: "rgba(255,255,255,0.5)",
    affix: "rgba(255,255,255,0.5)",
  },
  light: {
    bg: "#ffffff",
    border: "rgba(0,0,0,0.12)",
    focusBorder: "rgba(0,0,0,0.35)",
    text: "#171717",
    placeholder: "rgba(0,0,0,0.4)",
    affix: "rgba(0,0,0,0.45)",
  },
} as const

type InputSize = "sm" | "md" | "lg"

const SIZES: Record<InputSize, { height: number; padding: number; fontSize: number; radius: number }> = {
  sm: { height: 32, padding: 10, fontSize: 12, radius: 8 },
  md: { height: 38, padding: 12, fontSize: 13, radius: 8 },
  lg: { height: 44, padding: 16, fontSize: 14, radius: 12 },
}

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** "auto" follows the app's dark class / prefers-color-scheme. */
  theme?: ThemeMode
  size?: InputSize
  /** Node rendered inside the field, before the text (icon, prefix). */
  leading?: ReactNode
  /** Node rendered inside the field, after the text (reveal toggle, unit). */
  trailing?: ReactNode
  fullWidth?: boolean
  /** Border colour at rest / on focus. Overrides the theme palette. */
  borderColor?: string
  focusBorderColor?: string
  /** Additive — safe for layout tweaks. Never needed for core visuals. */
  className?: string
  /** Merged last, so it can override any inline style. */
  style?: CSSProperties
  /** Applied to the wrapper when leading/trailing are used. */
  wrapperClassName?: string
  wrapperStyle?: CSSProperties
  /** Render a <textarea> instead of an <input>. Ignores leading/trailing. */
  multiline?: boolean
  /** Rows for the multiline variant. */
  rows?: number
}

/**
 * Text field: translucent fill, hairline border that brightens on focus, no
 * shine or glow. Accepts every native <input> prop.
 *
 * Portable: all essential styling is inline (works with or without Tailwind) and
 * focus is handled in JS, so no global CSS is required. `leading`/`trailing`
 * wrap the input in a flex row and the border moves to that wrapper.
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  {
    theme = "auto",
    size = "lg",
    leading,
    trailing,
    fullWidth = false,
    borderColor,
    focusBorderColor,
    className,
    style,
    wrapperClassName,
    wrapperStyle,
    multiline = false,
    rows = 3,
    disabled,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false)
  const mode = useThemeMode(theme)
  const c = PALETTE[mode]
  const s = SIZES[size]
  const wrapped = Boolean(leading || trailing)

  const rest_ = borderColor ?? c.border
  const active = focusBorderColor ?? c.focusBorder

  const frame: CSSProperties = {
    boxSizing: "border-box",
    width: fullWidth ? "100%" : "auto",
    borderRadius: s.radius,
    border: `0.7px solid ${focused && !disabled ? active : rest_}`,
    backgroundColor: c.bg,
    transition: "all 0.8s cubic-bezier(0.2,0.8,0.2,1)",
    cursor: disabled ? "not-allowed" : "text",
    opacity: disabled ? 0.5 : 1,
  }

  // Shared field styling. border/background are intentionally omitted here: a
  // standalone input carries the framed look itself (frame merged in below),
  // while a wrapped input sits inside the framed wrapper and stays transparent.
  const field: CSSProperties = {
    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,
    height: wrapped ? "100%" : s.height,
    padding: `0 ${s.padding}px`,
    outline: "none",
    color: c.text,
    fontSize: s.fontSize,
    fontWeight: 300,
    cursor: "inherit",
    WebkitTapHighlightColor: "transparent",
  }

  const input = (
    <input
      ref={ref}
      disabled={disabled}
      onFocus={(e) => { setFocused(true); onFocus?.(e) }}
      onBlur={(e) => { setFocused(false); onBlur?.(e) }}
      className={[`hs-input-${mode}`, className].filter(Boolean).join(" ")}
      style={wrapped ? { ...field, border: "none", background: "transparent", ...style } : { ...frame, ...field, display: "block", ...style }}
      {...rest}
    />
  )

  // ::placeholder can't be expressed inline, so the rule ships with the component
  const placeholderCss = (
    <style>{`.hs-input-dark::placeholder{color:${PALETTE.dark.placeholder}}.hs-input-light::placeholder{color:${PALETTE.light.placeholder}}`}</style>
  )

  if (multiline) {
    return (
      <>
        {placeholderCss}
        <textarea
          rows={rows}
          disabled={disabled}
          onFocus={(e) => { setFocused(true); (onFocus as ((e: unknown) => void) | undefined)?.(e) }}
          onBlur={(e) => { setFocused(false); (onBlur as ((e: unknown) => void) | undefined)?.(e) }}
          className={[`hs-input-${mode}`, className].filter(Boolean).join(" ")}
          style={{
            ...frame,
            ...field,
            height: "auto",
            minHeight: s.height,
            padding: `${Math.round(s.padding * 0.7)}px ${s.padding}px`,
            display: "block",
            resize: "none",
            lineHeight: 1.5,
            ...style,
          }}
          {...(rest as unknown as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      </>
    )
  }

  if (!wrapped) {
    return (
      <>
        {placeholderCss}
        {input}
      </>
    )
  }

  return (
    <>
      {placeholderCss}
      <div
        className={wrapperClassName}
        style={{ display: "flex", alignItems: "center", height: s.height, ...frame, ...wrapperStyle }}
      >
        {leading && <span style={{ display: "flex", paddingLeft: s.padding, color: c.affix }}>{leading}</span>}
        {input}
        {trailing && <span style={{ display: "flex", paddingRight: s.padding, color: c.affix }}>{trailing}</span>}
      </div>
    </>
  )
})
