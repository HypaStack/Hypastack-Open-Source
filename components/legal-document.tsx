"use client"

import type { ReactNode } from "react"
import { motion } from "motion/react"
import { Typography, Separator } from "@heroui/react"

interface DateItem {
  label: string
  value: string
}

interface LegalDocumentProps {
  title: string
  dates: DateItem[]
  intro?: ReactNode
  children: ReactNode
}

export function LegalDocument({ title, dates, intro, children }: LegalDocumentProps) {
  return (
    <div className="flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <Typography type="h1" className="text-[clamp(32px,4.5vw,52px)] text-foreground">{title}</Typography>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {dates.map((d) => (
            <Typography key={d.label} type="body-sm" color="muted">{d.label}: {d.value}</Typography>
          ))}
        </div>
      </motion.div>

      <Separator className="mt-8 mb-10" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }}
        className="flex flex-col gap-12"
      >
        {intro && <Typography type="body" className="text-foreground font-medium">{intro}</Typography>}
        {children}
      </motion.div>
    </div>
  )
}

export function LegalSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      {title && (
        <Typography type="h3" className="text-[clamp(20px,2.6vw,28px)] text-foreground">{title}</Typography>
      )}
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

export function LegalParagraph({ lead, className, children }: { lead?: boolean; className?: string; children: ReactNode }) {
  return (
    <Typography
      type="body"
      color={lead ? undefined : "muted"}
      className={lead ? `text-foreground font-medium ${className ?? ""}` : className}
    >
      {children}
    </Typography>
  )
}

export function LegalList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ul className={`list-disc list-inside space-y-2.5 ml-2 text-muted-foreground ${className ?? ""}`}>
      {children}
    </ul>
  )
}
