"use client"

import type { ReactNode, CSSProperties } from "react"
import { Card } from "@heroui/react"

/** Shared shell every settings row in the preferences modal sits on, a real
 *  HeroUI Card (variant="transparent" so its own bg/shadow/radius don't apply,
 *  restyled to the app's flat 12px bordered-surface look used everywhere else). */
export function SettingsCard({ className = "", style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <Card variant="transparent" className={`!p-4 border border-separator bg-surface rounded-[12px] ${className}`} style={style}>
      {children}
    </Card>
  )
}
