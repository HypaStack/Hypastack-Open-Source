"use client"

import { useCallback, useSyncExternalStore } from "react"
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE_CODE,
  STORAGE_KEY_LANGUAGE,
  type Language,
} from "@/constants"

const STORAGE_KEY = STORAGE_KEY_LANGUAGE
const DEFAULT_CODE = DEFAULT_LANGUAGE_CODE

function readStored(): string {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw && SUPPORTED_LANGUAGES.some((l) => l.code === raw)) return raw
  return DEFAULT_CODE
}

// Cross-component sync within the same tab, plus cross-tab via `storage`.
function subscribe(onStoreChange: () => void) {
  window.addEventListener("hypa-language-changed", onStoreChange)
  window.addEventListener("storage", onStoreChange)
  return () => {
    window.removeEventListener("hypa-language-changed", onStoreChange)
    window.removeEventListener("storage", onStoreChange)
  }
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
  // Read through useSyncExternalStore rather than an effect: React reads the
  // store during the hydration commit, so the stored value is in place before
  // the first paint instead of one render after it.
  const code = useSyncExternalStore(subscribe, readStored, () => DEFAULT_CODE)

  const setLanguage = useCallback((next: string) => {
    if (!SUPPORTED_LANGUAGES.some((l) => l.code === next)) return
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next)
      window.dispatchEvent(new CustomEvent("hypa-language-changed", { detail: next }))
    }
  }, [])

  const language = SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? SUPPORTED_LANGUAGES[0]

  return { language, languages: SUPPORTED_LANGUAGES, setLanguage }
}
