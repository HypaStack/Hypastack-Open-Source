/**
 * Tier display constants used across UI components.
 * For tier limits (storage bytes, upload caps, etc.) see constants/tier-limits.ts.
 */

export type PreferencesTier = "free" | "plus" | "pro" | "max"

/** Human-readable label for each tier */
export const TIER_LABELS: Record<string, string> = {
  free: "Free",
  plus: "Plus",
  pro: "Pro",
  max: "Max",
}

/** Ordered list of all tiers */
export const TIER_ORDER: PreferencesTier[] = ["free", "plus", "pro", "max"]
