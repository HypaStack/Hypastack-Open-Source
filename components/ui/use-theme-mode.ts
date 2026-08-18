"use client"

import { useEffect, useState } from "react"

export type ThemeMode = "light" | "dark" | "auto"
export type ResolvedTheme = "light" | "dark"

/** Element whose class list marks dark mode. Overridable for portability. */
const DARK_CLASS = "dark"

function readDocumentTheme(): ResolvedTheme {
  if (typeof document === "undefined") return "dark"
  return document.documentElement.classList.contains(DARK_CLASS) ? "dark" : "light"
}

// "auto" follows .dark on <html>, falls back to prefers-color-scheme if unused.
// Renders "dark" on the server to match the app default, corrects on mount.
export function useThemeMode(theme: ThemeMode = "auto"): ResolvedTheme {
  const [resolved, setResolved] = useState<ResolvedTheme>("dark")

  useEffect(() => {
    if (theme !== "auto") return

    const root = document.documentElement
    const usesClass = root.classList.contains(DARK_CLASS) || document.querySelector(`.${DARK_CLASS}`) !== null

    if (!usesClass && window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      const sync = () => setResolved(mq.matches ? "dark" : "light")
      sync()
      mq.addEventListener("change", sync)
      return () => mq.removeEventListener("change", sync)
    }

    setResolved(readDocumentTheme())
    const observer = new MutationObserver(() => setResolved(readDocumentTheme()))
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [theme])

  return theme === "auto" ? resolved : theme
}
