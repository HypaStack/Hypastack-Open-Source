"use client"

import { useEffect, useRef } from "react"
import { UPLOAD_PROCESS_SVG } from "./upload-process-svg"

// Tray upload mark. The inlined SVG animates via SMIL — we freeze it on the
// first frame while idle and let it run while an upload is in progress. Color
// comes from currentColor, so it follows the tray's light/dark text color.
export function UploadProcessIcon({ active, size = 24 }: { active: boolean; size?: number }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const svg = ref.current?.querySelector("svg") as SVGSVGElement | null
    if (!svg) return
    if (active) {
      svg.unpauseAnimations()
    } else {
      svg.setCurrentTime(0)
      svg.pauseAnimations()
    }
  }, [active])

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className="shrink-0 inline-block text-[#888] dark:text-[#898e97]"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: UPLOAD_PROCESS_SVG }}
    />
  )
}
