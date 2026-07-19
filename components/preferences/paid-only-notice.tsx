"use client"

import { AlertMessage } from "@/components/ui/alert-message"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { type PreferencesTab } from "./shared"

/** Shown wherever the API surface is locked behind a paid plan. */
export function PaidOnlyNotice({ onSwitchTab }: { onSwitchTab?: (tab: PreferencesTab) => void }) {
  return (
    <AlertMessage tone="info" role="status" style={{ marginBottom: 0 }}>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[13px]">The API is on paid plans only. Pick one to get your keys.</span>
        <SecondaryButton size="xs" onClick={() => onSwitchTab?.("plans")} style={{ height: 26 }}>
          See pricing
        </SecondaryButton>
      </span>
    </AlertMessage>
  )
}
