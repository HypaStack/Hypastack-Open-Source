/**
 * Tier display constants used across UI components.
 * For tier limits (storage bytes, upload caps, etc.) see lib/tier-limits.ts.
 */

export type PreferencesTier = "free" | "essential" | "premium" | "ultimate"

/** Human-readable label for each tier */
export const TIER_LABELS: Record<string, string> = {
  free: "Free",
  essential: "Essential",
  premium: "Premium",
  ultimate: "Ultimate",
}

/** Storage quota label shown in the plans/account UI */
export const TIER_STORAGE: Record<PreferencesTier, string> = {
  free: "5 GB",
  essential: "300 GB",
  premium: "750 GB",
  ultimate: "1100 GB",
}

/** Ordered list of all tiers */
export const TIER_ORDER: PreferencesTier[] = ["free", "essential", "premium", "ultimate"]
