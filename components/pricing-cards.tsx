"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { ToggleSwitch } from "@/components/ui/toggle-switch"
import { ShineButton } from "@/components/ui/shine-button"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { ShineCard } from "@/components/ui/shine-card"
import { TIER_ORDER, getTierLimits, formatTierSize, isUnlimited, type PreferencesTier } from "@/constants"
import { PLAN_INFO } from "@/constants/plans"

const HEADING_FONT = { fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }

// Tier rendered as the green "best value" card. Visual-only rename premium → Pro.
const POPULAR: PreferencesTier = "premium"

const PAID_TIERS = TIER_ORDER.filter((t) => t !== "free")

function displayLabel(tier: PreferencesTier, label: string): string {
  if (tier === "premium") return "Pro"
  if (tier === "ultimate") return "Max"
  return label
}

const TAGLINE: Record<PreferencesTier, string> = {
  free: "For getting started",
  essential: "For everyday sharing",
  premium: "For power users",
  ultimate: "For heavy workloads",
}

// Feature bullets per tier (storage is shown separately in the metric box).
// Numbers derive from tier-limits.ts so the cards can't drift from the limits.
function bullets(tier: PreferencesTier): string[] {
  const l = getTierLimits(tier)
  const upload = formatTierSize(l.maxNormalUploadSize)
  const cdn = formatTierSize(l.maxCdnFileSize)
  const links = isUnlimited(l.maxFileLinks) && isUnlimited(l.maxCdnLinks)
    ? "Unlimited share links & CDN assets"
    : `${l.maxFileLinks} file + ${l.maxCdnLinks} CDN links`

  switch (tier) {
    case "essential":
      return [
        `Up to ${upload} per file`,
        `Up to ${cdn} per CDN Asset`,
        links,
        "Custom share links",
        "Custom expiration up to 30 days",
        `Create funnels — ${l.maxFunnelLinks} links`,
        "Download-page branding",
      ]
    case "premium":
      return [
        `Up to ${upload} per file`,
        `Up to ${cdn} per CDN Asset`,
        links,
        `${l.expirationMultiplier}× expiration windows`,
        `${l.maxFunnelLinks} funnel links`,
        "Fast support",
      ]
    case "ultimate":
      return [
        `Up to ${upload} per file`,
        `Up to ${cdn} per CDN Asset`,
        links,
        `${l.expirationMultiplier}× expiration windows`,
        `${l.maxFunnelLinks} funnel links`,
        "Priority support",
      ]
    default:
      return []
  }
}

const PLUS_HEADER: Record<PreferencesTier, string | null> = {
  free: null,
  essential: null,
  premium: "Everything in Essential, plus:",
  ultimate: "Everything in Pro, plus:",
}

// "13.99 € / month" -> "13.99 €".
function priceAmount(tier: PreferencesTier, annual: boolean): string {
  const plan = PLAN_INFO.find((p) => p.key === tier)!
  return (annual ? plan.annual : plan.monthly).split(" / ")[0]
}

export function PricingCards() {
  const [annual, setAnnual] = useState(true)

  return (
    <>
      <div className="mb-10 flex items-center justify-center gap-3">
        <span className={`text-[14px] ${!annual ? "text-[#f7f8f8] font-medium" : "text-[#898e97]"}`}>Monthly</span>
        <ToggleSwitch checked={annual} onChange={setAnnual} aria-label="Toggle annual billing" />
        <span className={`text-[14px] ${annual ? "text-[#f7f8f8] font-medium" : "text-[#898e97]"}`}>
          Yearly <span className="text-[#a5b4fc]">· save 20%</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PAID_TIERS.map((tier, i) => {
          const plan = PLAN_INFO.find((p) => p.key === tier)!
          const label = displayLabel(tier, plan.label)
          const green = tier === POPULAR
          const storage = formatTierSize(getTierLimits(tier).maxCdnStorage)
          const plusHeader = PLUS_HEADER[tier]

          const inner = (
            <>
              {/* header */}
              <div>
                <h3 className="text-[30px] font-semibold text-[#f7f8f8] leading-none" style={HEADING_FONT}>{label}</h3>
                <p className="mt-2 text-[14px] text-[#898e97]">{TAGLINE[tier]}</p>
              </div>

              {/* price */}
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-[40px] font-semibold text-[#f7f8f8] tracking-tight leading-none" style={HEADING_FONT}>
                  {priceAmount(tier, annual)}
                </span>
                <span className="text-[14px] text-[#898e97]">/ {annual ? "year" : "month"}</span>
              </div>

              {/* headline metric box (storage) */}
              <div
                className={`mt-7 flex items-center justify-between rounded-[16px] border px-4 py-3.5 ${
                  green ? "border-[rgba(79,70,229,0.4)] bg-[rgba(79,70,229,0.08)]" : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MIcon name="database" size={18} className="text-[#f7f8f8]" />
                  <span className="text-[17px] font-semibold text-[#f7f8f8]">{storage}</span>
                  {green && (
                    <span className="rounded-md bg-[rgba(79,70,229,0.25)] px-1.5 py-0.5 text-[11px] font-semibold text-[#a5b4fc]">Best value</span>
                  )}
                </div>
                <span className="text-[13px] text-[#898e97]">of storage</span>
              </div>

              {/* features */}
              <div className="mt-7">
                {plusHeader && <p className="mb-4 text-[14px] font-semibold text-[#f7f8f8]">{plusHeader}</p>}
                <ul className="space-y-3.5">
                  {bullets(tier).map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <MIcon name="check" size={17} className={`shrink-0 mt-0.5 ${green ? "text-[#a5b4fc]" : "text-[#f7f8f8]"}`} />
                      <span className="text-[15px] leading-snug text-[#d4d6d9]">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="mt-auto pt-9">
                {green ? (
                  <ShineButton href="/signin" as={Link} fullWidth aria-label={`Get ${label}`}>
                    Get {label}
                  </ShineButton>
                ) : (
                  <SecondaryButton href="/signin" as={Link} size="lg" fullWidth aria-label={`Get ${label}`}>
                    Get {label}
                  </SecondaryButton>
                )}
              </div>
            </>
          )

          return (
            <motion.div
              key={tier}
              className="h-full"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <ShineCard
                bg={green ? "rgba(64,64,64,0.3)" : "rgba(38,38,38,0.3)"}
                highlight={green}
                className="h-full p-7"
              >
                {inner}
              </ShineCard>
            </motion.div>
          )
        })}
      </div>
    </>
  )
}
