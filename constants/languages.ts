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
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "zh", label: "Chinese", native: "中文" },
]

export const DEFAULT_LANGUAGE_CODE = "en"
