"use client"

import { useState } from "react"
import { Button, Card, Chip, Typography } from "@heroui/react"
import { MIcon } from "@/components/ui/material-icon"

export function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <Card variant="transparent" className="relative group !p-0 !gap-0 overflow-hidden rounded-[16px] border !border-solid border-white/10 bg-overlay">
      {label && (
        <Card.Header className="flex-row items-center gap-2 px-4 py-2.5 border-b border-white/10">
          <Typography type="body-xs" weight="medium" className="tracking-[0.06em] uppercase text-muted">{label}</Typography>
        </Card.Header>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        isIconOnly
        onClick={() => {
          navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        }}
        aria-label="Copy to clipboard"
        className="absolute right-2.5 z-10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        style={{ top: label ? 40 : 8 }}
      >
        <MIcon name={copied ? "check" : "content_copy"} size={14} />
      </Button>

      <pre className="overflow-x-auto px-4 py-3.5 text-[12.5px] leading-[1.75]">
        <code className="text-foreground/80 font-mono whitespace-pre">{code}</code>
      </pre>
    </Card>
  )
}

const METHOD_COLOR: Record<string, "success" | "accent" | "danger" | "default"> = {
  GET: "success",
  POST: "accent",
  DELETE: "danger",
}

export function MethodBadge({ method }: { method: string }) {
  return (
    <Chip size="sm" variant="soft" color={METHOD_COLOR[method] ?? "default"} className="font-bold tracking-[0.08em]">
      {method}
    </Chip>
  )
}
