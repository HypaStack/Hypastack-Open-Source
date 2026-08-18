"use client"

import { useEffect, useState } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { Button, ButtonGroup, Chip, Typography } from "@heroui/react"
import { type PreferencesTier } from "@/constants"
import { PLAN_INFO } from "@/constants/plans"
import { type PreferencesTab, type PreferencesUser, resolveTier } from "./shared"
import { SettingsCard } from "./settings-card"

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
        <ButtonGroup size="sm">
          <Button variant={billing === "monthly" ? "secondary" : "tertiary"} onPress={() => setBilling("monthly")}>Monthly</Button>
          <Button variant={billing === "annual" ? "secondary" : "tertiary"} onPress={() => setBilling("annual")}>Annual</Button>
        </ButtonGroup>
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

        <SettingsCard className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <Typography type="body" weight="semibold" className="text-2xl text-foreground tracking-tight">{selectedPlan.label}</Typography>
            {isSelectedCurrent && <Chip size="sm" variant="soft" color="accent">Current</Chip>}
          </div>
          <Typography type="body-sm" color="muted" className="mb-4">
            {selectedPlan.key === "free"
              ? "Free forever"
              : isSelectedCurrent
                ? "Thanks for supporting Hypastack."
                : `Billed ${billing === "annual" ? "annually" : "once"}.`}
          </Typography>
          <Typography type="body" weight="semibold" className="text-foreground mb-2">Plan details</Typography>
          <ul className="space-y-1.5 mb-5">
            {selectedPlan.details.map((d) => (
              <li key={d} className="flex items-start gap-2">
                <MIcon name="check" size={16} className="text-muted shrink-0 mt-0.5" />
                <Typography type="body-sm" className="text-foreground">{d}</Typography>
              </li>
            ))}
          </ul>

          <div className="mt-auto">
            {!isSelectedCurrent && selectedPlan.key !== "free" && (
              <Button variant="primary" size="md" fullWidth onPress={() => onSwitchTab?.("billing")}>
                Switch to {selectedPlan.label}
              </Button>
            )}
            {!isSelectedCurrent && selectedPlan.key === "free" && (
              <Button variant="tertiary" size="md" fullWidth onPress={() => onSwitchTab?.("billing")}>
                Downgrade to Free
              </Button>
            )}
          </div>
        </SettingsCard>
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
      className={`w-full text-left p-4 transition-all border rounded-[12px] ${
        selected
          ? "bg-accent/10 border-accent/40"
          : "bg-surface hover:bg-white/5 border-separator"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <Chip size="sm" variant="soft">{tier}</Chip>
        {current && <Chip size="sm" variant="soft" color="accent">Current</Chip>}
      </div>
      <Typography type="body" weight="semibold" className="text-lg text-foreground tracking-tight">{size}</Typography>
      <Typography type="body-sm" color="muted" className="mt-0.5">{price}</Typography>
    </button>
  )
}
