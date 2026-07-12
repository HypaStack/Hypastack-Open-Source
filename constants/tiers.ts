/**
 * Tier display constants used across UI components.
 * For tier limits (storage bytes, upload caps, etc.) see constants/tier-limits.ts.
 */

export type PreferencesTier = "free" | "essential" | "premium" | "ultimate"

/** Human-readable label for each tier */
export const TIER_LABELS: Record<string, string> = {
  free: "Free",
  essential: "Essential",
  premium: "Pro",
  ultimate: "Max",
}

/** Ordered list of all tiers */
export const TIER_ORDER: PreferencesTier[] = ["free", "essential", "premium", "ultimate"]
