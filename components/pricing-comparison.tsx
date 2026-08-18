import { MIcon } from "@/components/ui/material-icon"
import { Table, Typography } from "@heroui/react"
import { getTierLimits, formatTierSize, isUnlimited, type PreferencesTier, type TierLimits } from "@/constants"

// Columns align with the three plan cards above (Essential, Pro, Max).
const TIERS: PreferencesTier[] = ["essential", "premium", "ultimate"]
const LIMITS = TIERS.map(getTierLimits)
const TIER_LABELS = ["Essential", "Pro", "Max"]

type Cell = { on: boolean; main: string; suffix?: string; infinity?: boolean }
type Row = [Cell, Cell, Cell]
type Section = { icon: string; title: string; rows: Row[] }

// A per-tier value row, always included, value differs by tier.
function derive(pick: (l: TierLimits) => string, suffix?: string): Row {
  return LIMITS.map((l) => ({ on: true, main: pick(l), suffix })) as Row
}

// Same label included on every tier.
function all(main: string, opts?: { infinity?: boolean; suffix?: string }): Row {
  return TIERS.map(() => ({ on: true, main, ...opts })) as Row
}

// Progressive unlock, included only where the flag is true.
function unlock(main: string, ons: [boolean, boolean, boolean]): Row {
  return ons.map((on) => ({ on, main })) as Row
}

const f = formatTierSize

const SECTIONS: Section[] = [
  {
    icon: "database",
    title: "Storage & limits",
    rows: [
      derive((l) => f(l.maxCdnStorage), "storage"),
      derive((l) => f(l.maxNormalUploadSize), "per file"),
      derive((l) => f(l.maxCdnFileSize), "per CDN file"),
      derive((l) => isUnlimited(l.maxFileLinks) ? "Unlimited" : String(l.maxFileLinks), "file links"),
      derive((l) => isUnlimited(l.maxCdnLinks) ? "Unlimited" : String(l.maxCdnLinks), "CDN links"),
      derive((l) => `${l.expirationMultiplier}×`, "expiration windows"),
    ],
  },
  {
    icon: "lock",
    title: "Sharing & privacy",
    rows: [
      all("Client-side encryption"),
      all("EXIF / metadata stripping"),
      all("Custom share links"),
      all("Custom expiration up to 30 days"),
      all("Download-page branding"),
    ],
  },
  {
    icon: "move_to_inbox",
    title: "Funnels",
    rows: [
      all("One-time inbound file drops"),
      derive((l) => String(l.maxFunnelLinks), "funnel links"),
      derive((l) => f(l.maxFunnelUploadSize), "per funnel file"),
    ],
  },
  {
    icon: "terminal",
    title: "Developer API",
    rows: [
      all("REST API for files and CDN"),
      derive((l) => String(l.maxApiKeys), "API keys"),
    ],
  },
  {
    icon: "support_agent",
    title: "Support",
    rows: [
      all("Standard support"),
      unlock("Fast support", [false, true, true]),
      unlock("Priority support", [false, false, true]),
    ],
  },
]

function CellView({ c }: { c: Cell }) {
  if (!c.on) {
    return (
      <div className="flex items-center justify-center gap-2.5 text-muted">
        <span className="w-4 shrink-0 text-center">—</span>
        <Typography type="body-sm">
          {c.main}
          {c.suffix ? ` ${c.suffix}` : ""}
        </Typography>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center gap-2.5">
      <MIcon name={c.infinity ? "all_inclusive" : "check"} size={16} className="shrink-0 text-foreground" />
      <Typography type="body-sm" className="text-foreground">
        {c.main}
        {c.suffix ? <span className="text-muted"> {c.suffix}</span> : null}
      </Typography>
    </div>
  )
}

export function PricingComparison() {
  return (
    <div className="mt-20">
      {SECTIONS.map((section) => (
        <div key={section.title} className="mt-12 first:mt-0">
          <div className="flex items-center gap-2.5 pb-4">
            <MIcon name={section.icon} size={19} className="text-foreground" />
            <Typography type="body-sm" weight="semibold" className="text-foreground">{section.title}</Typography>
          </div>

          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label={`${section.title} plan comparison`}>
                <Table.Header>
                  {TIER_LABELS.map((label, i) => (
                    <Table.Column key={label} isRowHeader={i === 0} className="text-center">
                      {label}
                    </Table.Column>
                  ))}
                </Table.Header>
                <Table.Body>
                  {section.rows.map((row, i) => (
                    <Table.Row key={i} id={`${section.title}-${i}`}>
                      {row.map((cell, j) => (
                        <Table.Cell key={j}>
                          <CellView c={cell} />
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </div>
      ))}
    </div>
  )
}
