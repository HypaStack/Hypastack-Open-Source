
export type Tier = "free" | "essential" | "premium" | "ultimate"

export const TIERS: readonly Tier[] = ["free", "essential", "premium", "ultimate"] as const

export interface TierLimits {
  label: string
  maxNormalUploadSize: number
  maxCdnFileSize: number
  maxCdnStorage: number
  maxCdnLinks: number
  maxFileLinks: number
  maxFilesPerUpload: number
  maxCdnFilesPerUpload: number
  maxTotalFiles: number
  expirationMultiplier: number
}

const MB = 1024 * 1024
const GB = 1024 * MB

export const FREE_LIMITS: TierLimits = {
  label: "Free",
  maxNormalUploadSize: 100 * MB,
  maxCdnFileSize: 20 * MB,
  maxCdnStorage: 5 * GB,
  maxCdnLinks: 10,
  maxFileLinks: 10,
  maxFilesPerUpload: 10,
  maxCdnFilesPerUpload: 20,
  maxTotalFiles: 10,
  expirationMultiplier: 1,
}

export const ESSENTIAL_LIMITS: TierLimits = {
  label: "Essential",
  maxNormalUploadSize: 550 * MB,
  maxCdnFileSize: 200 * MB,
  maxCdnStorage: 300 * GB,
  maxCdnLinks: 30,
  maxFileLinks: 25,
  maxFilesPerUpload: 50,
  maxCdnFilesPerUpload: 100,
  maxTotalFiles: 0,
  expirationMultiplier: 2,
}

export const PREMIUM_LIMITS: TierLimits = {
  label: "Premium",
  maxNormalUploadSize: 1000 * MB,
  maxCdnFileSize: 500 * MB,
  maxCdnStorage: 750 * GB,
  maxCdnLinks: 100,
  maxFileLinks: 75,
  maxFilesPerUpload: 200,
  maxCdnFilesPerUpload: 500,
  maxTotalFiles: 0,
  expirationMultiplier: 3,
}

export const ULTIMATE_LIMITS: TierLimits = {
  label: "Ultimate",
  maxNormalUploadSize: 2500 * MB,
  maxCdnFileSize: 1000 * MB,
  maxCdnStorage: 1100 * GB,
  maxCdnLinks: 500,
  maxFileLinks: 500,
  maxFilesPerUpload: 1000,
  maxCdnFilesPerUpload: 2500,
  maxTotalFiles: 0,
  expirationMultiplier: 4,
}

const TIER_TO_LIMITS: Record<Tier, TierLimits> = {
  free: FREE_LIMITS,
  essential: ESSENTIAL_LIMITS,
  premium: PREMIUM_LIMITS,
  ultimate: ULTIMATE_LIMITS,
}

export function normalizeTier(value: string | null | undefined): Tier {
  if (!value) return "free"
  const v = value.toLowerCase()
  if (v === "essential" || v === "premium" || v === "ultimate" || v === "free") return v
  if (v === "advanced" || v === "local") return v === "advanced" ? "essential" : "free"
  return "free"
}

export function getTierLimits(tier: Tier | boolean): TierLimits {
  if (typeof tier === "boolean") return tier ? ESSENTIAL_LIMITS : FREE_LIMITS
  return TIER_TO_LIMITS[tier] ?? FREE_LIMITS
}

export function isPaidTier(tier: Tier): boolean {
  return tier !== "free"
}

export function getTierLabel(tier: Tier): string {
  return TIER_TO_LIMITS[tier]?.label ?? "Free"
}

export function getTierDelayMs(tier: Tier): number {
  switch (tier) {
    case 'ultimate': return 0
    case 'premium': return 1000
    case 'essential': return 2000
    case 'free':
    default: return 3000
  }
}
