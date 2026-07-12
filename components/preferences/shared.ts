import { type PreferencesTier } from "@/constants"

export type PreferencesTab = "general" | "account" | "plans" | "billing" | "integrations" | "security"

export interface PreferencesUser {
  id: string
  nickname: string
  avatarUrl: string | null
  bannerUrl?: string | null
  displayName?: string | null
  displayNameChangedAt?: string | null
  nicknameChangedAt?: string | null
  verified?: boolean
  premium: boolean
  tier?: PreferencesTier
  inactivityPurgeDays?: number
}

export function resolveTier(user: PreferencesUser): PreferencesTier {
  return user.tier ?? (user.premium ? "essential" : "free")
}

export interface PreferencesStorage {
  totalStorage: number
  maxStorage: number
  storagePercent: number
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "kB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

// Format a storage percentage to at most 1 decimal. Tiny non-zero usage floors
// to 0.1% so it never reads as "0%" when some space is actually used.
export function formatStoragePct(pct: number): string {
  if (pct <= 0) return "0"
  if (pct < 0.1) return "0.1"
  return String(Math.round(pct * 10) / 10)
}
