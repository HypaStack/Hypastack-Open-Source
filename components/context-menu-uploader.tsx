"use client"

import { useEffect, useState, useRef } from "react"
import { isTauri } from "@/lib/tauri"

/**
 * Listens for the `context-menu-upload` event from Rust (fired when
 * the user right-clicks a file in Explorer → "Upload with HypaDrive").
 *
 * Emits a custom DOM event `hypadrive:upload` that the upload zone can pick up,
 * passing the file path so the native upload engine handles it.
 */
export function ContextMenuUploader() {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle")
  const [message, setMessage] = useState("")
  const [progress, setProgress] = useState(0)
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

        // Dispatch a custom DOM event that the upload-zone component can handle
        // This triggers the auto-upload flow with the native file path
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

  // This component is invisible — it just bridges Rust events to the DOM
  return null
}
