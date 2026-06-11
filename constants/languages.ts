/**
 * Supported UI languages.
 * Single source of truth consumed by useLanguage and the preferences modal.
 */

export interface Language {
  code: string
  label: string
  native: string
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en", label: "English", native: "English" },
]

export const DEFAULT_LANGUAGE_CODE = "en"
