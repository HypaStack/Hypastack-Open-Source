"use client"

import { useEffect, useState } from "react"
import { Typography } from "@heroui/react"
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
    <nav>
      {GROUPS.map((group) => (
        <div key={group.title} className="mb-6">
          <Typography type="body-xs" weight="semibold" className="tracking-[0.08em] uppercase text-muted mb-2 px-2">
            {group.title}
          </Typography>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={`block px-2 py-1 rounded-md text-[13px] transition-colors ${
                    active === item.id
                      ? "text-foreground bg-white/[0.06] font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
