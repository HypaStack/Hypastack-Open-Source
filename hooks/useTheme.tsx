"use client"

import { useEffect, useState, useCallback } from "react"

export type ThemePreference = "system" | "light" | "dark"
export type ResolvedTheme = "light" | "dark"

const STORAGE_KEY = "hypa-theme"

function readStored(): ThemePreference {
  if (typeof window === "undefined") return "dark"
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw === "light" || raw === "dark" || raw === "system") return raw
  return "dark"
}

/**
 * Persistent theme preference scoped to the dashboard. "system" follows OS
 * via prefers-color-scheme. Choice survives reloads via localStorage. The
 * dashboard layout reads `resolvedTheme` and applies it as a class on its
 * wrapper — we deliberately don't touch <html> so the marketing site and
 * auth pages keep their own design language untouched.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>("dark")
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark")

  // Hydrate from storage exactly once
  useEffect(() => {
    setThemeState(readStored())
  }, [])

  // Resolve "system" against OS, react to changes
  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const compute = () => {
      const r: ResolvedTheme = theme === "system" ? (mq.matches ? "dark" : "light") : theme
      setResolvedTheme(r)
    }
    compute()
    if (theme === "system") {
      mq.addEventListener("change", compute)
      return () => mq.removeEventListener("change", compute)
    }
  }, [theme])

  const setTheme = useCallback((next: ThemePreference) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next)
    }
    setThemeState(next)
    // Broadcast to other tabs/components using the same hook
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hypa-theme-changed", { detail: next }))
    }
  }, [])

  // Listen for cross-component changes within the same tab
  useEffect(() => {
    if (typeof window === "undefined") return
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ThemePreference>).detail
      if (detail) setThemeState(detail)
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setThemeState(readStored())
    }
    window.addEventListener("hypa-theme-changed", onChange as EventListener)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener("hypa-theme-changed", onChange as EventListener)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  return { theme, resolvedTheme, setTheme }
}
