"use client"

import { Typography } from "@heroui/react"
import { type PreferencesUser } from "./shared"
import { SettingsCard } from "./settings-card"

export function BillingTab({ }: { user: PreferencesUser }) {
  return (
    <SettingsCard>
      <Typography type="body" weight="semibold" className="text-foreground mb-1.5">We&apos;re working on it.</Typography>
      <Typography type="body-sm" color="muted" className="leading-relaxed max-w-md">
        Billing isn&apos;t expected until next month. If you want to upgrade your plan in the meantime, contact Kiko at usekiko@hypamail.me
        <br /><br />
        All donations appreciated, this project is self funded.
      </Typography>
    </SettingsCard>
  )
}
