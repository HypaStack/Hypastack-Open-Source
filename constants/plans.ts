import { type PreferencesTier } from "@/constants"
import { getTierLimits, formatTierSize } from "./tier-limits"

export type PlanInfo = {
  key: PreferencesTier
  label: string
  size: string
  monthly: string
  annual: string
  details: string[]
}

// Pricing + non-numeric feature copy per tier. Every size/link/expiry NUMBER is
// derived from tier-limits.ts in buildDetails() below — that file is the single
// source of truth, so these cards can never drift from the enforced limits.
const PLAN_META: Record<PreferencesTier, { label: string; monthly: string; annual: string; features: string[] }> = {
  free: {
    label: "Free",
    monthly: "Free forever",
    annual: "Free forever",
    features: ["Standard expiration"],
  },
  essential: {
    label: "Essential",
    monthly: "13.99 € / month",
    annual: "139.99 € / year",
    features: ["Custom share links (files + CDN)", "Custom expiration up to 30 days", "Custom display name and banner (Branding)", "Create Funnels"],
  },
  premium: {
    label: "Premium",
    monthly: "24.99 € / month",
    annual: "249.99 € / year",
    features: ["Custom share links (files + CDN)", "Custom expiration up to 30 days", "Custom display name and banner (Branding)", "Create Funnels", "Fast support"],
  },
  ultimate: {
    label: "Ultimate",
    monthly: "32.99 € / month",
    annual: "329.99 € / year",
    features: ["Custom share links (files + CDN)", "Custom expiration up to 30 days", "Custom display name and banner (Branding)", "Create Funnels", "Priority support"],
  },
}

const TIER_KEYS: PreferencesTier[] = ["free", "essential", "premium", "ultimate"]

function buildDetails(key: PreferencesTier): string[] {
  const l = getTierLimits(key)
  const storage = formatTierSize(l.maxCdnStorage)
  const upload = formatTierSize(l.maxNormalUploadSize)
  const cdn = formatTierSize(l.maxCdnFileSize)
  const links = `${l.maxCdnLinks} CDN links, ${l.maxFileLinks} file links`
  const { features } = PLAN_META[key]

  if (key === "free") {
    return [
      `${storage} of storage`,
      `${upload} max single upload, ${cdn} Max single CDN Upload`,
      links,
      ...features,
    ]
  }

  // Ultimate says "4x expiration"; the other paid tiers say "…windows".
  const expiry = key === "ultimate"
    ? `${l.expirationMultiplier}x expiration`
    : `${l.expirationMultiplier}x expiration windows`

  return [
    `${storage} of storage`,
    `Up to ${upload} per file (${cdn} CDN)`,
    links,
    expiry,
    ...features,
  ]
}

export const PLAN_INFO: PlanInfo[] = TIER_KEYS.map((key) => ({
  key,
  label: PLAN_META[key].label,
  size: formatTierSize(getTierLimits(key).maxCdnStorage),
  monthly: PLAN_META[key].monthly,
  annual: PLAN_META[key].annual,
  details: buildDetails(key),
}))
