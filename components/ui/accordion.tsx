"use client"

import type { CSSProperties, ReactNode } from "react"
import { Disclosure } from "@heroui/react"

interface AccordionItemProps {
  /** Header content — a string, or any node for richer triggers. */
  title: ReactNode
  children: ReactNode
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
 * One collapsible panel — HeroUI's real Disclosure (own expand/collapse height
 * animation, a11y wiring), styled to Hypastack's hairline-card look. Works
 * standalone, same as before.
 */
export function AccordionItem({
  title,
  children,
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
  return (
    <Disclosure
      isExpanded={open}
      defaultExpanded={defaultOpen}
      onExpandedChange={onOpenChange}
      isDisabled={disabled}
      className={className}
      style={{
        boxSizing: "border-box",
        border: "0.7px solid var(--border)",
        borderRadius: 8,
        overflow: "hidden",
        ...(delay !== null ? { opacity: 0, animation: `hs-blur-down 1s ease ${delay}s forwards` } : {}),
        ...style,
      }}
    >
      <style>{`@keyframes hs-blur-down{from{opacity:0;filter:blur(6px);transform:translateY(-6px)}to{opacity:1;filter:blur(0);transform:none}}`}</style>
      <Disclosure.Heading>
        <Disclosure.Trigger
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxSizing: "border-box",
            width: "100%",
            padding: 16,
            textAlign: "left",
            backgroundColor: "var(--surface-tertiary)",
            ...headerStyle,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 300, lineHeight: "24px" }}>{title}</span>
          <Disclosure.Indicator>
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
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </Disclosure.Indicator>
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body style={{ padding: 16, backgroundColor: "var(--surface-tertiary)", ...panelStyle }}>
          <div style={{ fontSize: 14, lineHeight: "20px", color: "var(--muted)" }}>{children}</div>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
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
