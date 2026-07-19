"use client"

import { useEffect, useState, useCallback } from "react"
import { STORAGE_KEY_DEVELOPER_MODE } from "@/constants"

const STORAGE_KEY = STORAGE_KEY_DEVELOPER_MODE

function readStored(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(STORAGE_KEY) === "1"
}

/**
 * Whether the Developer tab is revealed in preferences. Survives reloads via
 * localStorage and broadcasts so the toggle (Account tab) and the tab list
 * (modal shell) stay in sync without threading state through props.
 *
 * This is a UI reveal only — it does not grant API access. Tier gating is
 * enforced separately by the caller (and, once the API lands, server-side).
 */
export function useDeveloperMode() {
  const [enabled, setEnabledState] = useState(false)

  // Read after mount so SSR and the first client render agree.
  useEffect(() => {
    setEnabledState(readStored())
  }, [])

  const setEnabled = useCallback((next: boolean) => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
    setEnabledState(next)
    window.dispatchEvent(new CustomEvent("hypa-developer-mode-changed", { detail: next }))
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const onChange = (e: Event) => setEnabledState((e as CustomEvent<boolean>).detail)
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setEnabledState(readStored())
    }
    window.addEventListener("hypa-developer-mode-changed", onChange as EventListener)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener("hypa-developer-mode-changed", onChange as EventListener)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  return { developerMode: enabled, setDeveloperMode: setEnabled }
}
