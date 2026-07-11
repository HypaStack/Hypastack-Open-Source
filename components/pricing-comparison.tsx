import { MIcon } from "@/components/ui/material-icon"
import { getTierLimits, formatTierSize, isUnlimited, type PreferencesTier, type TierLimits } from "@/constants"

// Columns align with the three plan cards above (Essential, Pro, Max).
const TIERS: PreferencesTier[] = ["essential", "premium", "ultimate"]
const LIMITS = TIERS.map(getTierLimits)

type Cell = { on: boolean; main: string; suffix?: string; infinity?: boolean }
type Row = [Cell, Cell, Cell]
type Section = { icon: string; title: string; rows: Row[] }

// A per-tier value row — always included, value differs by tier.
function derive(pick: (l: TierLimits) => string, suffix?: string): Row {
  return LIMITS.map((l) => ({ on: true, main: pick(l), suffix })) as Row
}

// Same label included on every tier.
function all(main: string, opts?: { infinity?: boolean; suffix?: string }): Row {
  return TIERS.map(() => ({ on: true, main, ...opts })) as Row
}

// Progressive unlock — included only where the flag is true.
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
      <div className="flex items-center gap-2.5 text-[#585c63]">
        <span className="w-4 shrink-0 text-center">—</span>
        <span className="text-[15px]">
          {c.main}
          {c.suffix ? ` ${c.suffix}` : ""}
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2.5">
      <MIcon name={c.infinity ? "all_inclusive" : "check"} size={16} className="shrink-0 text-[#e6e7e9]" />
      <span className="text-[15px] text-[#f7f8f8]">
        {c.main}
        {c.suffix ? <span className="text-[#6b7280]"> {c.suffix}</span> : null}
      </span>
    </div>
  )
}

export function PricingComparison() {
  return (
    <div className="mt-20">
      {SECTIONS.map((section) => (
        <div key={section.title} className="mt-12 first:mt-0">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[rgba(255,255,255,0.1)]">
            <MIcon name={section.icon} size={19} className="text-[#f7f8f8]" />
            <span className="text-[15px] font-semibold text-[#f7f8f8]">{section.title}</span>
          </div>
          {section.rows.map((row, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
              {row.map((cell, j) => (
                <CellView key={j} c={cell} />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
