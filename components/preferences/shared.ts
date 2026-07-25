import { type PreferencesTier } from "@/constants"

export type PreferencesTab = "general" | "account" | "plans" | "billing" | "integrations" | "security" | "developer"

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

