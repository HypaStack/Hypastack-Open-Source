"use client"

import { useId, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { useThemeMode, type ThemeMode } from "./use-theme-mode"

const PALETTE = {
  dark: {
    border: "rgb(38,38,38)",
    header: "rgba(38,38,38,0.3)",
    headerHover: "rgba(64,64,64,0.3)",
    title: "#ffffff",
    panel: "rgba(38,38,38,0.3)",
    body: "rgb(212,212,212)",
    chevron: "rgb(163,163,163)",
  },
  light: {
    border: "rgb(229,229,229)",
    header: "rgba(0,0,0,0.02)",
    headerHover: "rgba(0,0,0,0.05)",
    title: "#171717",
    panel: "rgba(0,0,0,0.02)",
    body: "rgb(82,82,82)",
    chevron: "rgb(115,115,115)",
  },
} as const

function ChevronDown({ open, color }: { open: boolean; color: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{
        flexShrink: 0,
        color,
        transform: open ? "rotate(180deg)" : "none",
        transition: "transform 0.3s ease",
      }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

interface AccordionItemProps {
  /** Header content — a string, or any node for richer triggers. */
  title: ReactNode
  children: ReactNode
  /** "auto" follows the app's dark class / prefers-color-scheme. */
  theme?: ThemeMode
  /** Uncontrolled initial state. */
  defaultOpen?: boolean
  /** Controlled state; pair with onOpenChange. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
  /** Entrance delay in seconds for the blur-down animation; null disables it. */
  delay?: number | null
  className?: string
  /** Merged last, so it can override any inline style. */
  style?: CSSProperties
  /** Override the trigger row's padding, colours, typography. */
  headerStyle?: CSSProperties
  /** Override the expanded panel's padding and background. */
  panelStyle?: CSSProperties
}

/**
 * One collapsible panel: hairline card, tinted header that brightens on hover,
 * chevron that flips, and a height transition driven off the panel's own
 * scrollHeight (so it works with any content).
 *
 * Portable: all essential styling is inline and the keyframes ship with the
 * component. Works standalone or inside <Accordion>.
 */
export function AccordionItem({
  title,
  children,
  theme = "auto",
  defaultOpen = false,
  open,
  onOpenChange,
  disabled = false,
  delay = 0,
  className,
  style,
  headerStyle,
  panelStyle,
}: AccordionItemProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const [hover, setHover] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const id = useId()
  const c = PALETTE[useThemeMode(theme)]

  const isOpen = open ?? uncontrolled
  const toggle = () => {
    if (disabled) return
    const next = !isOpen
    if (open === undefined) setUncontrolled(next)
    onOpenChange?.(next)
  }

  return (
    <>
      <style>{`@keyframes hs-blur-down{from{opacity:0;filter:blur(6px);transform:translateY(-6px)}to{opacity:1;filter:blur(0);transform:none}}`}</style>
      <div
        className={className}
        style={{
          boxSizing: "border-box",
          border: `0.7px solid ${c.border}`,
          borderRadius: 8,
          overflow: "hidden",
          ...(delay !== null
            ? { opacity: 0, animation: `hs-blur-down 1s ease ${delay}s forwards` }
            : {}),
          ...style,
        }}
      >
        <button
          type="button"
          onClick={toggle}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-controls={id}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxSizing: "border-box",
            width: "100%",
            padding: 16,
            border: "none",
            textAlign: "left",
            color: c.title,
            backgroundColor: hover && !disabled && !isOpen ? c.headerHover : c.header,
            transition: "background-color 0.2s ease",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            WebkitTapHighlightColor: "transparent",
            ...headerStyle,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 300, lineHeight: "24px" }}>{title}</span>
          <ChevronDown open={isOpen} color={c.chevron} />
        </button>
        <div
          id={id}
          role="region"
          ref={panelRef}
          style={{
            overflow: "hidden",
            maxHeight: isOpen ? panelRef.current?.scrollHeight ?? 2000 : 0,
            transition: "max-height 0.3s ease-in-out",
          }}
        >
          <div style={{ padding: 16, backgroundColor: c.panel, ...panelStyle }}>
            <div style={{ fontSize: 14, lineHeight: "20px", color: c.body }}>{children}</div>
          </div>
        </div>
      </div>
    </>
  )
}

interface AccordionProps {
  children: ReactNode
  /** Gap between items, in px. */
  gap?: number
  className?: string
  style?: CSSProperties
}

/** Vertical stack of AccordionItems. Purely layout — each item owns its state. */
export function Accordion({ children, gap = 12, className, style }: AccordionProps) {
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap, ...style }}>
      {children}
    </div>
  )
}
