"use client"

/**
 * Returns true when the app is running inside the Tauri desktop shell.
 * Works both in dev (localhost:3000) and production (remote URL loaded in WebView).
 */
export function isTauri(): boolean {
  if (typeof window === "undefined") return false
  return !!(window as any).__TAURI_INTERNALS__
}
