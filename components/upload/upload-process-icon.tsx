"use client"

import { UPLOAD_PROCESS_SVG, UPLOAD_PROCESS_SVG_STATIC } from "./upload-process-svg"

// Tray upload mark. Both the animated and the static copies are mounted once and
// never re-injected — we only toggle CSS `display`. Keeping the animated node's
// identity stable means its SMIL animation runs continuously for the whole upload
// (it can't restart per-file on the frequent progress re-renders). Color comes
// from currentColor, so it follows the tray's light/dark text color.
export function UploadProcessIcon({ active, size = 24 }: { active: boolean; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="shrink-0 relative inline-block text-[#888] dark:text-[#898e97]"
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-0"
        style={{ display: active ? "block" : "none" }}
        dangerouslySetInnerHTML={{ __html: UPLOAD_PROCESS_SVG }}
      />
      <span
        className="absolute inset-0"
        style={{ display: active ? "none" : "block" }}
        dangerouslySetInnerHTML={{ __html: UPLOAD_PROCESS_SVG_STATIC }}
      />
    </span>
  )
}
