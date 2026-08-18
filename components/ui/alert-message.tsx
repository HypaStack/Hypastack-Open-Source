"use client"

import type { CSSProperties, ReactNode } from "react"
import { Alert } from "@heroui/react"

type AlertTone = "error" | "success" | "warning" | "info"

interface AlertMessageProps {
  children: ReactNode
  tone?: AlertTone
  /** Replace the default tone icon, or pass null to drop it. */
  icon?: ReactNode | null
  className?: string
  /** Merged last, so it can override any inline style. */
  style?: CSSProperties
  role?: "alert" | "status"
}

const TONE_STATUS: Record<AlertTone, "danger" | "success" | "warning" | "accent"> = {
  error: "danger",
  success: "success",
  warning: "warning",
  info: "accent",
}

function CircleAlertIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  )
}

/** Inline alert / validation message, HeroUI's Alert, tinted to the tone's soft fill. */
export function AlertMessage({
  children,
  tone = "error",
  icon,
  className,
  style,
  role = "alert",
}: AlertMessageProps) {
  const status = TONE_STATUS[tone]
  const showIcon = icon === undefined ? <CircleAlertIcon /> : icon

  return (
    <Alert
      status={status}
      role={role}
      className={className}
      style={{
        marginBottom: 8,
        backgroundColor: `var(--${status}-soft)`,
        padding: 8,
        ...style,
      }}
    >
      {showIcon && <Alert.Indicator>{showIcon}</Alert.Indicator>}
      <Alert.Content>
        <Alert.Description style={{ color: "inherit" }}>{children}</Alert.Description>
      </Alert.Content>
    </Alert>
  )
}
