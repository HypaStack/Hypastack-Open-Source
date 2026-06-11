"use client"

import { useEffect, useRef } from "react"
import { isTauri } from "@/lib/tauri"

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
        console.log("[ContextMenu] Upload requested for:", filePath)

        // autoupload
        window.dispatchEvent(
          new CustomEvent("hypadrive:upload", {
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
