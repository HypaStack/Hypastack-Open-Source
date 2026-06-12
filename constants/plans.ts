import { type PreferencesTier } from "@/constants"

export type PlanInfo = {
  key: PreferencesTier
  label: string
  size: string
  monthly: string
  annual: string
  details: string[]
}

export const PLAN_INFO: PlanInfo[] = [
  {
    key: "free",
    label: "Free",
    size: "300 MB",
    monthly: "Free forever",
    annual: "Free forever",
    details: [
      "300 MB of storage",
      "50 MB max single upload, 20 MB Max single CDN Upload",
      "3 CDN links, 3 file links",
      "Standard expiration",
    ],
  },
  {
    key: "essential",
    label: "Essential",
    size: "300GB",
    monthly: "13.99 € / month",
    annual: "139.99 € / year",
    details: [
      "300 GB of storage",
      "Up to 500MB per file (200MB CDN)",
      "45 CDN links, 45 file links",
      "2x expiration windows",
    ],
  },
  {
    key: "premium",
    label: "Premium",
    size: "750GB",
    monthly: "24.99 € / month",
    annual: "249.99 € / year",
    details: [
      "750 GB of storage",
      "Up to 1GB per file (500MB CDN)",
      "100 CDN links, 100 file links",
      "3x expiration windows",
      "Fast support",
    ],
  },
  {
    key: "ultimate",
    label: "Ultimate",
    size: "1TB",
    monthly: "32.99 € / month",
    annual: "329.99 € / year",
    details: [
      "1 TB of storage",
      "Up to 2.5GB per file (1GB CDN)",
      "125 CDN links, 125 file links",
      "4x expiration",
      "Priority support",
    ],
  },
]
