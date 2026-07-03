"use client"

import { UPLOAD_PROCESS_SVG, UPLOAD_PROCESS_SVG_STATIC } from "./upload-process-svg"

// Tray upload mark. Frozen (static markup) while idle; the animated markup is
// swapped in only while an upload is in progress, which restarts the animation
// cleanly each time and guarantees no leftover motion when idle. Color comes
// from currentColor, so it follows the tray's light/dark text color.
export function UploadProcessIcon({ active, size = 24 }: { active: boolean; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="shrink-0 inline-block text-[#888] dark:text-[#898e97]"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: active ? UPLOAD_PROCESS_SVG : UPLOAD_PROCESS_SVG_STATIC }}
    />
  )
}
