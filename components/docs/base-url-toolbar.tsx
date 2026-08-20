"use client"

import { useState } from "react"
import { Button, Separator, Toolbar } from "@heroui/react"
import { MIcon } from "@/components/ui/material-icon"

const BASE_URL = "https://api.hypastack.com/v3"

export function BaseUrlToolbar() {
  const [copied, setCopied] = useState(false)

  return (
    <Toolbar aria-label="API base URL" isAttached className="mt-8">
      <Button isDisabled variant="ghost" size="sm" className="font-mono text-[11px] tracking-[0.06em] uppercase">
        Base URL
      </Button>
      <Separator orientation="vertical" />
      <Button
        variant="ghost"
        size="sm"
        className="font-mono gap-2"
        onClick={() => {
          navigator.clipboard.writeText(BASE_URL)
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        }}
      >
        {BASE_URL}
        <MIcon name={copied ? "check" : "content_copy"} size={13} />
      </Button>
    </Toolbar>
  )
}
