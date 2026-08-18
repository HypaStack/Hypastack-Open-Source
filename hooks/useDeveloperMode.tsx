"use client"

import { useCallback, useSyncExternalStore } from "react"
import { STORAGE_KEY_DEVELOPER_MODE } from "@/constants"

const STORAGE_KEY = STORAGE_KEY_DEVELOPER_MODE

function readStored(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) === "1"
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("hypa-developer-mode-changed", onStoreChange)
  window.addEventListener("storage", onStoreChange)
  return () => {
    window.removeEventListener("hypa-developer-mode-changed", onStoreChange)
    window.removeEventListener("storage", onStoreChange)
  }
}

/**
 * Whether the Developer tab is revealed in preferences. Survives reloads via
 * localStorage and broadcasts so the toggle (Account tab) and the tab list
 * (modal shell) stay in sync without threading state through props.
 *
 * This is a UI reveal only, it does not grant API access. Tier gating is
 * enforced separately by the caller (and, once the API lands, server-side).
 */
export function useDeveloperMode() {
  // Read through useSyncExternalStore rather than an effect: React reads the
  // store during the hydration commit, so the stored value is in place before
  // the first paint instead of one render after it.
  const enabled = useSyncExternalStore(subscribe, readStored, () => false)

  const setEnabled = useCallback((next: boolean) => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
    window.dispatchEvent(new CustomEvent("hypa-developer-mode-changed", { detail: next }))
  }, [])

  return { developerMode: enabled, setDeveloperMode: setEnabled }
}
