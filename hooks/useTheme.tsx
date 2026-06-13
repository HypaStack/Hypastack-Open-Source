"use client"

import { useEffect, useState, useCallback } from "react"
import { STORAGE_KEY_THEME } from "@/constants"

export type ThemePreference = "system" | "light" | "dark"
export type ResolvedTheme = "light" | "dark"

const STORAGE_KEY = STORAGE_KEY_THEME

function readStored(): ThemePreference {
  if (typeof window === "undefined") return "dark"
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw === "light" || raw === "dark" || raw === "system") return raw
  return "dark"
}

function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === "system") {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    }
    return "dark"
  }
  return pref
}

/**
 * Persistent theme preference scoped to the dashboard. "system" follows OS
 * via prefers-color-scheme. Choice survives reloads via localStorage. The
 * dashboard layout reads `resolvedTheme` and applies it as a class on its
 * wrapper. We also sync .dark to <html> so Tailwind dark: variants work
 * globally.
 *
 * NOTE: is-dashboard / is-public classes are set by the inline script in
 * app/layout.tsx on initial load, so we do NOT touch them here to avoid
 * causing re-render cascades on every navigation.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>(() => readStored())
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(readStored()))

  // Resolve "system" against OS, react to changes
  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const compute = () => {
      setResolvedTheme(resolveTheme(theme))
    }
    compute()
    if (theme === "system") {
      mq.addEventListener("change", compute)
      return () => mq.removeEventListener("change", compute)
    }
  }, [theme])

  // Sync .dark class to <html> so Tailwind dark: variants work globally
  // and sync theme-color meta tag for mobile browser chrome (iOS Safari bars etc.)
  useEffect(() => {
    if (typeof document === "undefined") return
    const root = document.documentElement
    const isDashboard = root.classList.contains("is-dashboard")

    // Recreate the theme-color tag cleanly
    document.querySelectorAll('meta[name="theme-color"]').forEach(el => el.remove())
    const metaTheme = document.createElement('meta')
    metaTheme.setAttribute('name', 'theme-color')
    document.head.appendChild(metaTheme)

    if (resolvedTheme === "dark") {
      root.classList.add("dark")
      metaTheme.setAttribute('content', '#111111')
    } else {
      root.classList.remove("dark")
      metaTheme.setAttribute('content', isDashboard ? '#f0f0f0' : '#ffffff')
    }
  }, [resolvedTheme])

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
