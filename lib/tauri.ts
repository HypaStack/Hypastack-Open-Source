"use client"

export function isTauri(): boolean {
  if (typeof window === "undefined") return false
  return !!(window as any).__TAURI_INTERNALS__
}
