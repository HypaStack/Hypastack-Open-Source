
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
  maxFunnelUploadSize: number
  maxFunnelLinks: number
}

const MB = 1024 * 1024
const GB = 1024 * MB

// Sentinel for an uncapped countable limit (file links / CDN assets). Large
// enough that every quota check and the atomic insert guard pass as-is, so the
// uncap needs no changes to enforcement — only the UI formats it as "Unlimited".
export const UNLIMITED = Number.MAX_SAFE_INTEGER
export const isUnlimited = (n: number): boolean => n >= UNLIMITED

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
  maxFunnelUploadSize: 0, // Funnel not available on Free
  maxFunnelLinks: 0,
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
  maxFunnelUploadSize: 100 * MB,
  maxFunnelLinks: 10,
}

export const PREMIUM_LIMITS: TierLimits = {
  label: "Pro",
  maxNormalUploadSize: 5 * GB,
  maxCdnFileSize: 500 * MB,
  maxCdnStorage: 750 * GB,
  maxCdnLinks: 100,
  maxFileLinks: 100,
  maxFilesPerUpload: 100,
  maxCdnFilesPerUpload: 100,
  maxTotalFiles: 0, // Unrestricted (bottlenecked by link count)
  expirationMultiplier: 3,
  maxFunnelUploadSize: 300 * MB,
  maxFunnelLinks: 25,
}

export const ULTIMATE_LIMITS: TierLimits = {
  label: "Max",
  maxNormalUploadSize: 100 * GB,
  maxCdnFileSize: 2 * GB,
  maxCdnStorage: 1000 * GB, // Adjusted to exactly 1TB
  maxCdnLinks: UNLIMITED,
  maxFileLinks: UNLIMITED,
  maxFilesPerUpload: 125,
  maxCdnFilesPerUpload: 125,
  maxTotalFiles: 0, // Unrestricted (bottlenecked by link count)
  expirationMultiplier: 4,
  maxFunnelUploadSize: 1000 * MB,
  maxFunnelLinks: 50,
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

/**
 * Render a tier byte limit as its marketing-facing label (e.g. "2.5 GB",
 * "300 GB", "1 TB"). This is the single formatter behind every size shown in
 * the plans UI, the FAQ and the account modal — so those never drift from the
 * numbers above.
 *
 * Per-file caps are authored in MiB and read decimally (1000 MiB → "1 GB",
 * 2500 MiB → "2.5 GB"); storage caps are whole GiB and read as-is
 * (300 GiB → "300 GB", 1000 GiB → "1 TB").
 */
export function formatTierSize(bytes: number): string {
  const mib = Math.round(bytes / MB)
  // Whole-GiB values are storage caps → group by 1000 into TB.
  if (mib % 1024 === 0) {
    const gib = mib / 1024
    return gib % 1000 === 0 ? `${gib / 1000} TB` : `${gib} GB`
  }
  // Otherwise a per-file cap authored in MiB, read decimally.
  return mib >= 1000 ? `${parseFloat((mib / 1000).toFixed(1))} GB` : `${mib} MB`
}
