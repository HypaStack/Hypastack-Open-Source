"use client"

import { useState } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { API_BASE } from "@/constants"
import { getFileIconForType } from "./_helpers"

export function FileThumb({
  id,
  name,
  fallbackIcon,
}: {
  id: string
  name: string
  fallbackIcon: string
}) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className="h-full w-full flex items-center justify-center text-[#7dd3fc]">
        <MIcon name={fallbackIcon} size={20} />
      </div>
    )
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img loading="lazy" decoding="async"
      src={`${API_BASE}/files/${id}/preview`}
      alt={name}
      className="h-full w-full object-cover select-none pointer-events-none"
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}
