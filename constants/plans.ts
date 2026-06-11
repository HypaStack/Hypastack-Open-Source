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
    key: "essential",
    label: "Essential",
    size: "300GB",
    monthly: "13.99 € / month",
    annual: "167.99 € / year",
    details: [
      "300 GB of storage",
      "550 MB max upload, 200 MB CDN",
      "30 CDN links - 25 file links",
      "2x expiration windows",
    ],
  },
  {
    key: "premium",
    label: "Premium",
    size: "750GB",
    monthly: "24.99 € / month",
    annual: "299.99 € / year",
    details: [
      "750 GB of storage",
      "1 GB max upload, 500 MB CDN",
      "100 CDN links - 75 file links",
      "3x expiration windows",
    ],
  },
  {
    key: "ultimate",
    label: "Ultimate",
    size: "1.1TB",
    monthly: "39.99 € / month",
    annual: "479.99 € / year",
    details: [
      "1.1 TB of storage",
      "2.5 GB max upload, 1 GB CDN",
      "500 CDN links - 500 file links",
      "4x expiration - priority support",
    ],
  },
  {
    key: "free",
    label: "Free",
    size: "1GB",
    monthly: "Free forever",
    annual: "Free forever",
    details: [
      "1 GB of storage",
      "100 MB max upload, 20 MB CDN",
      "10 CDN links - 10 file links",
      "Standard expiration",
    ],
  },
]
