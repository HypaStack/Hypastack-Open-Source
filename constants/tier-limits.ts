
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
  maxNormalUploadSize: 50 * MB,
  maxCdnFileSize: 20 * MB,
  maxCdnStorage: 300 * MB,
  maxCdnLinks: 3,
  maxFileLinks: 3,
  maxFilesPerUpload: 3,
  maxCdnFilesPerUpload: 3,
  maxTotalFiles: 6, // 3 CDN + 3 Normal
  expirationMultiplier: 1,
}

export const ESSENTIAL_LIMITS: TierLimits = {
  label: "Essential",
  maxNormalUploadSize: 500 * MB,
  maxCdnFileSize: 200 * MB,
  maxCdnStorage: 300 * GB,
  maxCdnLinks: 45,
  maxFileLinks: 45,
  maxFilesPerUpload: 45,
  maxCdnFilesPerUpload: 45,
  maxTotalFiles: 0, // Unrestricted (bottlenecked by link count)
  expirationMultiplier: 2,
}

export const PREMIUM_LIMITS: TierLimits = {
  label: "Premium",
  maxNormalUploadSize: 1000 * MB,
  maxCdnFileSize: 500 * MB,
  maxCdnStorage: 750 * GB,
  maxCdnLinks: 100,
  maxFileLinks: 100,
  maxFilesPerUpload: 100,
  maxCdnFilesPerUpload: 100,
  maxTotalFiles: 0, // Unrestricted (bottlenecked by link count)
  expirationMultiplier: 3,
}

export const ULTIMATE_LIMITS: TierLimits = {
  label: "Ultimate",
  maxNormalUploadSize: 2500 * MB,
  maxCdnFileSize: 1000 * MB,
  maxCdnStorage: 1000 * GB, // Adjusted to exactly 1TB
  maxCdnLinks: 125,
  maxFileLinks: 125,
  maxFilesPerUpload: 125,
  maxCdnFilesPerUpload: 125,
  maxTotalFiles: 0, // Unrestricted (bottlenecked by link count)
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
