"use client"

import { useState } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { PANEL } from "./doc-style"

export function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="relative group overflow-hidden" style={{ ...PANEL, borderRadius: 16 }}>
      {/* top-down sheen, same lift the shine surfaces use */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{ background: "linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0))" }}
      />

      {label && (
        <div className="relative flex items-center gap-2 px-4 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
          <span className="text-[11px] font-medium text-[#6b7076] tracking-[0.06em] uppercase">{label}</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        }}
        aria-label="Copy to clipboard"
        className="absolute right-2.5 z-10 h-7 w-7 flex items-center justify-center rounded-full text-[#6b7076] hover:text-[#f7f8f8] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.09)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
        style={{ top: label ? 44 : 10 }}
      >
        <MIcon name={copied ? "check" : "content_copy"} size={13} />
      </button>

      <pre className="relative overflow-x-auto px-4 py-3.5 text-[12.5px] leading-[1.75]">
        <code className="text-[#c9d1d9] font-mono whitespace-pre">{code}</code>
      </pre>
    </div>
  )
}

const METHOD_COLORS: Record<string, string> = {
  GET: "#3fb950",
  POST: "#58a6ff",
  DELETE: "#f85149",
}

export function MethodBadge({ method }: { method: string }) {
  const color = METHOD_COLORS[method] ?? "#8b949e"
  return (
    <span
      className="inline-flex items-center shrink-0 text-[10px] font-bold tracking-[0.08em] px-2 py-[3px] rounded-full"
      style={{ color, backgroundColor: `${color}14`, border: `1px solid ${color}2e` }}
    >
      {method}
    </span>
  )
}
