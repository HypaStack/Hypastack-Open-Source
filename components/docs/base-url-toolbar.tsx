"use client"

import { useState } from "react"
import { Button, ButtonGroup } from "@heroui/react"
import { MIcon } from "@/components/ui/material-icon"

const BASE_URL = "https://api.hypastack.com/v3"

// ButtonGroup clones every direct child with a __button_group_child prop, and
// HeroUI's own ButtonGroup.Separator spreads that straight onto its <span>,
// which React complains about. This renders the same class, minus the leak.
function GroupSeparator() {
  return <span aria-hidden data-slot="button-group-separator" className="button-group__separator" />
}

export function BaseUrlToolbar() {
  const [copied, setCopied] = useState(false)

  return (
    <ButtonGroup aria-label="API base URL" variant="tertiary" className="mt-8">
      <Button isDisabled className="font-mono text-[11px] tracking-[0.06em] uppercase text-muted">
        Base URL
      </Button>
      <GroupSeparator />
      <Button
        className="font-mono gap-2 text-foreground"
        onClick={() => {
          navigator.clipboard.writeText(BASE_URL)
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        }}
      >
        {BASE_URL}
        <MIcon name={copied ? "check" : "content_copy"} size={13} />
      </Button>
    </ButtonGroup>
  )
}
