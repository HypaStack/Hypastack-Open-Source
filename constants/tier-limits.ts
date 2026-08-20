
export type Tier = "free" | "plus" | "pro" | "max"

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
  maxRequestUploadSize: number
  maxRequestLinks: number
  maxApiKeys: number
}

const MB = 1024 * 1024
const GB = 1024 * MB

// Sentinel for an uncapped countable limit (file links / CDN assets). Large
// enough that every quota check and the atomic insert guard pass as-is, so the
// uncap needs no changes to enforcement, only the UI formats it as "Unlimited".
const UNLIMITED = Number.MAX_SAFE_INTEGER
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
  maxRequestUploadSize: 0, // FileRequest not available on Free
  maxRequestLinks: 0,
  maxApiKeys: 0, // API not available on Free
}

const PLUS_LIMITS: TierLimits = {
  label: "Plus",
  maxNormalUploadSize: 1 * GB,
  maxCdnFileSize: 200 * MB,
  maxCdnStorage: 300 * GB,
  maxCdnLinks: 45,
  maxFileLinks: 45,
  maxFilesPerUpload: 45,
  maxCdnFilesPerUpload: 45,
  maxTotalFiles: 0, // Unrestricted (bottlenecked by link count)
  expirationMultiplier: 2,
  maxRequestUploadSize: 100 * MB,
  maxRequestLinks: 10,
  maxApiKeys: 1,
}

const PRO_LIMITS: TierLimits = {
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
  maxRequestUploadSize: 300 * MB,
  maxRequestLinks: 25,
  maxApiKeys: 3,
}

export const MAX_LIMITS: TierLimits = {
  label: "Max",
  maxNormalUploadSize: 100 * GB,
  maxCdnFileSize: 2 * GB,
  maxCdnStorage: 1000 * GB, // Adjusted to exactly 1TB
  maxCdnLinks: UNLIMITED,
  maxFileLinks: UNLIMITED,
  maxFilesPerUpload: UNLIMITED,
  maxCdnFilesPerUpload: UNLIMITED,
  maxTotalFiles: 0, // Unrestricted (bottlenecked by link count)
  expirationMultiplier: 4,
  maxRequestUploadSize: 1000 * MB,
  maxRequestLinks: 50,
  maxApiKeys: 5,
}

const TIER_TO_LIMITS: Record<Tier, TierLimits> = {
  free: FREE_LIMITS,
  plus: PLUS_LIMITS,
  pro: PRO_LIMITS,
  max: MAX_LIMITS,
}

export function normalizeTier(value: string | null | undefined): Tier {
  if (!value) return "free"
  const v = value.toLowerCase()
  if (v === "free" || v === "plus" || v === "pro" || v === "max") return v
  // pre-rename values still in the wild (db rows, old sessions, saved payloads)
  if (v === "essential" || v === "advanced") return "plus"
  if (v === "premium") return "pro"
  if (v === "ultimate") return "max"
  return "free"
}

export function getTierLimits(tier: Tier | boolean): TierLimits {
  if (typeof tier === "boolean") return tier ? PLUS_LIMITS : FREE_LIMITS
  return TIER_TO_LIMITS[tier] ?? FREE_LIMITS
}

export function isPaidTier(tier: Tier): boolean {
  return tier !== "free"
}

/**
 * Per-item pause applied to bulk upload and delete loops. Paid plans are not
 * throttled at all; free keeps a pause so a single account can't monopolise the
 * origin with a thousand-item batch.
 */
export function getTierDelayMs(tier: Tier): number {
  return isPaidTier(tier) ? 0 : 3000
}

/**
 * How many CDN objects may be PUT to R2 at once. This is the throughput knob
 * for bulk uploads, the transfers go straight to storage, so the ceiling is
 * the browser's connection rather than anything of ours.
 */
export function getTierUploadConcurrency(tier: Tier): number {
  switch (tier) {
    case 'max': return 16
    case 'pro': return 8
    case 'plus': return 4
    case 'free':
    default: return 2
  }
}

// Single formatter behind every size shown in plans/FAQ/account modal. Per-file
// caps read decimally (1000 MiB -> "1 GB"); storage caps read as whole GiB.
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
