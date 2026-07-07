"use client"

import { useEffect, useRef } from "react"
import { isTauri } from "@/lib/tauri"
import { NATIVE_UPLOAD_EVENT } from "@/constants/upload"

export function ContextMenuUploader() {
  const unlistenRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!isTauri()) return

    let cancelled = false

    async function setup() {
      const { listen } = await import("@tauri-apps/api/event")

      const unlisten = await listen<{ path: string; name: string; size: number }>("context-menu-upload", (event) => {
        if (cancelled) return
        const { path: filePath, name, size } = event.payload

        // autoupload
        window.dispatchEvent(
          new CustomEvent(NATIVE_UPLOAD_EVENT, {
            detail: { filePath, name, size },
          })
        )
      })

      unlistenRef.current = unlisten
    }

    setup()

    return () => {
      cancelled = true
      unlistenRef.current?.()
    }
  }, [])

  // invisible
  return null
}
