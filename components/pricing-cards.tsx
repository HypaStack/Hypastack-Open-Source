"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { ButtonLink } from "@/components/ui/button-link"
import { Card, Chip, Switch, Typography } from "@heroui/react"
import { TIER_ORDER, getTierLimits, formatTierSize, isUnlimited, type PreferencesTier } from "@/constants"
import { PLAN_INFO } from "@/constants/plans"

// Tier rendered as the accent "best value" card.
const POPULAR: PreferencesTier = "pro"

const PAID_TIERS = TIER_ORDER.filter((t) => t !== "free")

const TAGLINE: Record<PreferencesTier, string> = {
  free: "For getting started",
  plus: "For everyday sharing",
  pro: "For power users",
  max: "For heavy workloads",
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
    case "plus":
      return [
        `Up to ${upload} per file`,
        `Up to ${cdn} per CDN Asset`,
        links,
        "Custom share links",
        "Custom expiration up to 30 days",
        `Create requests, ${l.maxRequestLinks} links`,
        "Download-page branding",
      ]
    case "pro":
      return [
        `Up to ${upload} per file`,
        `Up to ${cdn} per CDN Asset`,
        links,
        `${l.expirationMultiplier}× expiration windows`,
        `${l.maxRequestLinks} fileRequest links`,
        "Fast support",
      ]
    case "max":
      return [
        `Up to ${upload} per file`,
        `Up to ${cdn} per CDN Asset`,
        links,
        `${l.expirationMultiplier}× expiration windows`,
        `${l.maxRequestLinks} fileRequest links`,
        "Priority support",
      ]
    default:
      return []
  }
}

const PLUS_HEADER: Record<PreferencesTier, string | null> = {
  free: null,
  plus: null,
  pro: "Everything in Plus, plus:",
  max: "Everything in Pro, plus:",
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
        <Typography type="body-sm" className={!annual ? "font-medium text-foreground" : "text-muted"}>Monthly</Typography>
        <Switch isSelected={annual} onChange={setAnnual} aria-label="Toggle annual billing">
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Content>
        </Switch>
        <Typography type="body-sm" className={annual ? "font-medium text-foreground" : "text-muted"}>
          Yearly <span className="text-accent">· save 20%</span>
        </Typography>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PAID_TIERS.map((tier, i) => {
          const plan = PLAN_INFO.find((p) => p.key === tier)!
          const label = plan.label
          const green = tier === POPULAR
          const storage = formatTierSize(getTierLimits(tier).maxCdnStorage)
          const plusHeader = PLUS_HEADER[tier]

          return (
            <motion.div
              key={tier}
              className="h-full"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <Card
                variant="transparent"
                className={`relative h-full !p-0 !gap-0 flex flex-col bg-overlay border !border-solid rounded-[16px] ${
                  green ? "border-transparent" : "border-white/10"
                }`}
              >
                {green && (
                  // Border fades from full accent at the top edge to fully
                  // transparent by the vertical midpoint, a plain border-color
                  // can't do this, so it's a masked gradient overlay instead.
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-[16px]"
                    style={{
                      padding: 1,
                      background: "linear-gradient(to bottom, oklch(0.6204 0.195 253.83) 0%, transparent 50%)",
                      WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude",
                    }}
                  />
                )}
                <Card.Header className="p-7 pb-0">
                  <Card.Title className="text-4xl">{label}</Card.Title>
                  <Card.Description className="mt-2 text-[15px]">{TAGLINE[tier]}</Card.Description>
                </Card.Header>

                <Card.Content className="flex-1 p-7">
                  {/* price */}
                  <div className="flex items-baseline gap-2">
                    <Typography type="body" weight="bold" className="text-5xl tracking-tight text-foreground">{priceAmount(tier, annual)}</Typography>
                    <Typography type="body-sm" color="muted">/ {annual ? "year" : "month"}</Typography>
                  </div>

                  {/* headline metric (storage) */}
                  <div className="mt-7 flex items-center gap-3">
                    <Typography type="h3" className={`text-2xl ${green ? "text-accent" : "text-foreground"}`}>
                      {storage} Storage
                    </Typography>
                    {green && <Chip size="sm" variant="soft">Best value</Chip>}
                  </div>

                  {/* features */}
                  <div className="mt-7">
                    {plusHeader && <Typography type="body-sm" weight="semibold" className="mb-4 text-foreground">{plusHeader}</Typography>}
                    <ul className="space-y-3.5">
                      {bullets(tier).map((b) => (
                        <li key={b} className="flex items-start gap-3">
                          <MIcon name="check" size={17} className={`shrink-0 mt-0.5 ${green ? "text-accent" : "text-foreground"}`} />
                          <Typography type="body-sm" className="leading-snug text-foreground">{b}</Typography>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card.Content>

                <Card.Footer className="p-7 pt-0">
                  <ButtonLink href="/signin" as={Link} variant={green ? "primary" : "tertiary"} size="lg" fullWidth aria-label={`Get ${label}`}>
                    Get {label}
                  </ButtonLink>
                </Card.Footer>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </>
  )
}
