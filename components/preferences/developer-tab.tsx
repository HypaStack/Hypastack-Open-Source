"use client"

import { useCallback, useEffect, useState } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { Button, Separator, Typography } from "@heroui/react"
import { ButtonLink } from "@/components/ui/button-link"
import { Loader } from "@/components/ui/loader"
import { apiFetch } from "@/lib/http/fetch"
import { getTierLimits, isPaidTier, V3_REQUESTS_PER_MINUTE } from "@/constants"
import { type PreferencesTab, type PreferencesUser, resolveTier } from "./shared"
import { PaidOnlyNotice } from "./paid-only-notice"
import { ApiKeyList } from "./api-key-list"
import { CreateKeyDialog } from "./create-key-dialog"
import { type ApiKeySummary } from "./api-key-types"
import { SettingsCard } from "./settings-card"

export function DeveloperTab({ user, onSwitchTab }: { user: PreferencesUser; onSwitchTab?: (tab: PreferencesTab) => void }) {
  const tier = resolveTier(user)
  const unlocked = isPaidTier(tier)
  const maxKeys = getTierLimits(tier).maxApiKeys
  const perMinute = V3_REQUESTS_PER_MINUTE[tier]

  const [keys, setKeys] = useState<ApiKeySummary[]>([])
  const [loading, setLoading] = useState(unlocked)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = useCallback(async () => {
    if (!unlocked) return
    try {
      const res = await apiFetch("/api/v2/keys")
      if (res.ok) {
        const data = await res.json()
        setKeys(data.keys ?? [])
      }
    } catch {
      // Leave the list as-is; the empty state reads the same as a failed load.
    } finally {
      setLoading(false)
    }
  }, [unlocked])

  useEffect(() => { load() }, [load])

  const atLimit = keys.length >= maxKeys

  return (
    <div className="space-y-4">
      {!unlocked && <PaidOnlyNotice onSwitchTab={onSwitchTab} />}

      <SettingsCard>
        <div className="flex items-center gap-2 mb-1">
          <MIcon name="terminal" size={16} className="text-muted" />
          <Typography type="body" weight="semibold" className="text-foreground">Hypastack API</Typography>
        </div>
        <Typography type="body-sm" color="muted" className="leading-relaxed">
          A plain REST API over your files and Hosting assets. Every response is JSON, every failure carries a code you can switch on. Keys are shown once when you make them, so put yours somewhere safe.
        </Typography>
      </SettingsCard>

      <SettingsCard>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Typography type="body" weight="semibold" className="text-foreground">Documentation</Typography>
            <Typography type="body-sm" color="muted" className="mt-0.5 leading-snug">
              Every endpoint, every error code, with copyable examples.
            </Typography>
          </div>
          <ButtonLink href="https://docs.hypastack.com/api-reference/overview" target="_blank" rel="noopener noreferrer" variant="tertiary" size="sm" style={{ height: 32, gap: 6 }}>
            Read the docs
            <MIcon name="open_in_new" size={14} />
          </ButtonLink>
        </div>
      </SettingsCard>

      <SettingsCard>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Typography type="body" weight="semibold" className="text-foreground">API keys</Typography>
            <Typography type="body-sm" color="muted" className="mt-0.5">
              {unlocked ? `${keys.length} of ${maxKeys} used on ${getTierLimits(tier).label}` : "No keys on Free"}
            </Typography>
          </div>
          <Button
            variant="primary"
            size="sm"
            isDisabled={!unlocked || atLimit}
            onPress={() => setDialogOpen(true)}
            style={{ height: 32, gap: 6 }}
          >
            <MIcon name="add" size={15} />
            New key
          </Button>
        </div>

        {loading && (
          <Typography type="body-sm" color="muted" className="flex items-center gap-2 pt-3">
            <Loader size={14} /> Loading keys…
          </Typography>
        )}

        {!loading && keys.length > 0 && (
          <div className="mt-3">
            <ApiKeyList keys={keys} onChanged={load} />
          </div>
        )}

        {!loading && unlocked && atLimit && (
          <Typography type="body-sm" color="muted" className="mt-2.5">
            Revoke one to make room, or move up a plan for more.
          </Typography>
        )}
      </SettingsCard>

      <SettingsCard>
        <Typography type="body" weight="semibold" className="text-foreground">Limits</Typography>
        <Typography type="body-sm" color="muted" className="mt-0.5 mb-3">
          Every response carries your remaining budget in the headers, so you never have to guess.
        </Typography>
        <Separator />
        <LimitRow label="Keys on this plan" value={unlocked ? String(maxKeys) : "None"} />
        <Separator />
        <LimitRow label="Requests per key" value={unlocked ? `${perMinute} / minute` : "None"} />
      </SettingsCard>

      <CreateKeyDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={load}
      />
    </div>
  )
}

function LimitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <Typography type="body-sm" color="muted">{label}</Typography>
      <Typography type="body-sm" weight="medium" className="text-foreground">{value}</Typography>
    </div>
  )
}
