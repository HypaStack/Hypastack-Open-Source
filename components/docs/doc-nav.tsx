"use client"

import { useEffect, useState } from "react"
import { Header, ListBox, ListBoxItem, ListBoxSection, Typography } from "@heroui/react"
import { FILE_ENDPOINTS, CDN_ENDPOINTS } from "@/lib/docs/v3-endpoints"

const GUIDE = [
  { id: "quickstart", label: "Quickstart" },
  { id: "encryption", label: "Encryption" },
  { id: "authentication", label: "Authentication" },
  { id: "scopes", label: "Scopes" },
  { id: "uploading", label: "Uploading" },
  { id: "pagination", label: "Pagination" },
  { id: "errors", label: "Errors" },
  { id: "rate-limits", label: "Rate limits" },
]

const GROUPS = [
  { title: "Guide", items: GUIDE },
  { title: "Files", items: FILE_ENDPOINTS.map((e) => ({ id: e.id, label: e.title })) },
  { title: "CDN", items: CDN_ENDPOINTS.map((e) => ({ id: e.id, label: e.title })) },
  { title: "Reference", items: [{ id: "reference-script", label: "Full example" }] },
]

const ALL_IDS = GROUPS.flatMap((g) => g.items.map((i) => i.id))

export function DocNav() {
  const [active, setActive] = useState<string>("quickstart")

  // Highlights whichever section is nearest the top of the viewport, so the
  // sidebar tracks where you actually are rather than what you last clicked.
  useEffect(() => {
    const onScroll = () => {
      let current = ALL_IDS[0]
      for (const id of ALL_IDS) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= 120) current = id
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <ListBox aria-label="Documentation navigation" selectionMode="none" className="!p-0">
      {GROUPS.map((group) => (
        <ListBoxSection key={group.title} className="mt-6 first:mt-0">
          <Header>
            <Typography type="body-xs" weight="semibold" className="tracking-[0.08em] uppercase text-muted px-2 mb-2">
              {group.title}
            </Typography>
          </Header>
          {group.items.map((item) => (
            <ListBoxItem
              key={item.id}
              id={item.id}
              href={`#${item.id}`}
              textValue={item.label}
              className={`min-h-0 py-1.5 text-[13px] ${
                active === item.id ? "bg-default text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </ListBoxItem>
          ))}
        </ListBoxSection>
      ))}
    </ListBox>
  )
}
