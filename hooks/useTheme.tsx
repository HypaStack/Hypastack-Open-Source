"use client"

import { useEffect, useState } from "react"
import { STORAGE_KEY_THEME } from "@/constants"

export type ThemePreference = "system" | "light" | "dark"
export type ResolvedTheme = "light" | "dark"

function readStored(): ThemePreference {
  if (typeof window === "undefined") return "dark"
  const raw = window.localStorage.getItem(STORAGE_KEY_THEME)
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

// Dashboard theme preference. "system" follows OS via prefers-color-scheme.
// Syncs .dark on <html> and the theme-color meta tag for mobile browser chrome.
export function useTheme() {
  const [theme] = useState<ThemePreference>(() => readStored())
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(theme))

  useEffect(() => {
    if (typeof window === "undefined" || theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const compute = () => setResolvedTheme(resolveTheme(theme))
    mq.addEventListener("change", compute)
    return () => mq.removeEventListener("change", compute)
  }, [theme])

  // NOTE: is-dashboard / is-public classes are set by the inline script in
  // app/layout.tsx on initial load, so we do NOT touch them here.
  useEffect(() => {
    if (typeof document === "undefined") return
    const root = document.documentElement
    const isDashboard = root.classList.contains("is-dashboard")

    // Find or create a single theme-color meta tag — never remove existing ones
    // (removing causes Cannot read properties of null (reading 'removeChild') during React hydration)
    let metaTheme = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
    if (!metaTheme) {
      metaTheme = document.createElement('meta')
      metaTheme.setAttribute('name', 'theme-color')
      document.head.appendChild(metaTheme)
    }

    if (resolvedTheme === "dark") {
      root.classList.add("dark")
      metaTheme.setAttribute('content', '#111111')
    } else {
      root.classList.remove("dark")
      metaTheme.setAttribute('content', isDashboard ? '#f0f0f0' : '#ffffff')
    }
  }, [resolvedTheme])

  return { theme, resolvedTheme }
}
