"use client"

import { useEffect, useState, useCallback } from "react"

export interface Language {
  code: string
  label: string
  native: string
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en", label: "English", native: "English" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "zh", label: "Chinese", native: "中文" },
]

const STORAGE_KEY = "hypa-language"
const DEFAULT_CODE = "en"

function readStored(): string {
  if (typeof window === "undefined") return DEFAULT_CODE
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw && SUPPORTED_LANGUAGES.some((l) => l.code === raw)) return raw
  return DEFAULT_CODE
}

/**
 * Persistent UI language choice. Stored in localStorage[hypa-language] and
 * mirrored onto <html lang> so screen readers / browser features pick it up.
 *
 * Note: this only persists the preference. There's no i18n string catalog
 * wired up yet, so the UI stays English regardless. Plumb this into your
 * i18n library when you're ready.
 */
export function useLanguage() {
  const [code, setCodeState] = useState<string>(DEFAULT_CODE)

  useEffect(() => {
    setCodeState(readStored())
  }, [])

  const setLanguage = useCallback((next: string) => {
    if (!SUPPORTED_LANGUAGES.some((l) => l.code === next)) return
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next)
      window.dispatchEvent(new CustomEvent("hypa-language-changed", { detail: next }))
    }
    setCodeState(next)
  }, [])

  // Cross-component sync within the same tab
  useEffect(() => {
    if (typeof window === "undefined") return
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      if (detail) setCodeState(detail)
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setCodeState(readStored())
    }
    window.addEventListener("hypa-language-changed", onChange as EventListener)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener("hypa-language-changed", onChange as EventListener)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  const language = SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? SUPPORTED_LANGUAGES[0]

  return { language, languages: SUPPORTED_LANGUAGES, setLanguage }
}
