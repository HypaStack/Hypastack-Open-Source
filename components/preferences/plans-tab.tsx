"use client"

import { useEffect, useState, type ReactNode } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { ShineButton } from "@/components/ui/shine-button"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { type PreferencesTier } from "@/constants"
import { PLAN_INFO } from "@/constants/plans"
import { type PreferencesTab, type PreferencesUser, resolveTier } from "./shared"

export function PlansTab({ user, onSwitchTab }: { user: PreferencesUser; onSwitchTab?: (tab: PreferencesTab) => void }) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly")
  const currentTier = resolveTier(user)
  const [selectedTier, setSelectedTier] = useState<PreferencesTier>(currentTier)

  useEffect(() => {
    setSelectedTier(currentTier)
  }, [currentTier])

  const selectedPlan = PLAN_INFO.find((p) => p.key === selectedTier) ?? PLAN_INFO[0]
  const isSelectedCurrent = selectedTier === currentTier

  return (
    <div>
      <div className="flex items-center justify-center mb-5">
        <div className="inline-flex p-1 bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.02)] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.06)]" style={{ borderRadius: 12 }}>
          <SecondaryButton
            variant={billing === "monthly" ? "solid" : "ghost"}
            size="sm"
            onClick={() => setBilling("monthly")}
            style={{ borderRadius: 8, fontSize: 14 }}
          >
            Monthly
          </SecondaryButton>
          <SecondaryButton
            variant={billing === "annual" ? "solid" : "ghost"}
            size="sm"
            onClick={() => setBilling("annual")}
            style={{ borderRadius: 8, fontSize: 14 }}
          >
            Annual
          </SecondaryButton>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-3">
          {PLAN_INFO.map((p) => (
            <PlanCard
              key={p.key}
              tier={p.label}
              size={p.size}
              price={billing === "monthly" ? p.monthly : p.annual}
              current={p.key === currentTier}
              selected={p.key === selectedTier}
              onClick={() => setSelectedTier(p.key)}
            />
          ))}
        </div>

        <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)] flex flex-col" style={{ borderRadius: 12, padding: 16 }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[22px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0] tracking-tight">{selectedPlan.label}</p>
            {isSelectedCurrent && <ShineBadge primary>Current</ShineBadge>}
          </div>
          <p className="text-[13px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] mb-4 font-normal">
            {selectedPlan.key === "free"
              ? "Free forever"
              : isSelectedCurrent
                ? "Thanks for supporting Hypastack."
                : `Billed ${billing === "annual" ? "annually" : "once"}.`}
          </p>
          <p className="text-[14px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0] mb-2">Plan details</p>
          <ul className="space-y-1.5 text-[14px] text-[#444] dark:text-[#a1a1aa] font-normal mb-5">
            {selectedPlan.details.map((d) => (
              <li key={d} className="flex items-start gap-2">
                <MIcon name="check" size={16} className="text-[#555] shrink-0 mt-0.5" />
                <span>{d}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto">
            {!isSelectedCurrent && selectedPlan.key !== "free" && (
              <ShineButton size="md" fullWidth onClick={() => onSwitchTab?.("billing")}>
                Switch to {selectedPlan.label}
              </ShineButton>
            )}
            {!isSelectedCurrent && selectedPlan.key === "free" && (
              <SecondaryButton size="md" fullWidth onClick={() => onSwitchTab?.("billing")}>
                Downgrade to Free
              </SecondaryButton>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PlanCard({
  tier,
  size,
  price,
  current,
  selected,
  onClick,
}: {
  tier: string
  size: string
  price: string
  current?: boolean
  selected?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-4 transition-all relative border overflow-hidden ${
        selected
          ? "bg-white dark:bg-[rgba(255,255,255,0.04)] border-[#111] dark:border-[rgba(255,255,255,0.25)]"
          : "bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] hover:bg-[#f0f0f0] dark:hover:bg-[rgba(255,255,255,0.06)] border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]"
      }`}
      style={{ borderRadius: 12 }}
    >
      {selected && (
        <div className="absolute inset-0 pointer-events-none rounded-[12px] ring-1 ring-inset ring-[rgba(255,255,255,0.1)] dark:ring-[rgba(255,255,255,0.1)]" />
      )}
      <div className="flex items-center justify-between mb-2">
        <ShineBadge>{tier}</ShineBadge>
        {current && <ShineBadge primary>Current</ShineBadge>}
      </div>
      <p className="text-[22px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0] tracking-tight">{size}</p>
      <p className="text-[13px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] mt-0.5 font-normal">{price}</p>
    </button>
  )
}

// Non-interactive badge that borrows the ShineButton look: subtle/gray for
// tiers, primary gloss for "Current". A span (not ShineButton) since these sit
// inside the clickable PlanCard <button>.
function ShineBadge({ children, primary = false }: { children: ReactNode; primary?: boolean }) {
  if (primary) {
    return (
      <span
        className="inline-flex items-center h-[22px] px-2.5 rounded-[7px] text-[11px] font-medium text-white select-none shrink-0"
        style={{
          backgroundColor: "#2680bf",
          backgroundImage: "linear-gradient(rgba(255,255,255,0.12), rgba(255,255,255,0))",
          borderTop: "1px solid rgba(255,255,255,0.6)",
          boxShadow:
            "rgba(0,0,0,0.05) 0px 1px 0px 0px, rgba(0,0,0,0.1) 0px 2px 2px 0px, #195a87 0px -1px 0px 0px inset",
        }}
      >
        {children}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center h-[22px] px-2.5 rounded-[7px] text-[11px] font-medium select-none shrink-0 bg-black/[0.05] text-[#171717] dark:bg-white/[0.06] dark:text-[#f7f8f8]">
      {children}
    </span>
  )
}
