/**
 * Tier display constants used across UI components.
 * For tier limits (storage bytes, upload caps, etc.) see constants/tier-limits.ts.
 */

import { getTierLimits, formatTierSize } from "./tier-limits"

export type PreferencesTier = "free" | "essential" | "premium" | "ultimate"

/** Human-readable label for each tier */
export const TIER_LABELS: Record<string, string> = {
  free: "Free",
  essential: "Essential",
  premium: "Premium",
  ultimate: "Ultimate",
}

/** Storage quota label shown in the plans/account UI. Derived from the storage
 *  caps in tier-limits.ts so the label can never drift from the enforced value. */
export const TIER_STORAGE: Record<PreferencesTier, string> = {
  free: formatTierSize(getTierLimits("free").maxCdnStorage),
  essential: formatTierSize(getTierLimits("essential").maxCdnStorage),
  premium: formatTierSize(getTierLimits("premium").maxCdnStorage),
  ultimate: formatTierSize(getTierLimits("ultimate").maxCdnStorage),
}

/** Ordered list of all tiers */
export const TIER_ORDER: PreferencesTier[] = ["free", "essential", "premium", "ultimate"]
