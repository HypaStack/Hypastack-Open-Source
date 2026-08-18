"use client"

import { useEffect, useState } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { Button, Typography } from "@heroui/react"
import { Dropdown } from "@/components/ui/dropdown"
import { isBiometricSupported, isBiometricEnrolled, clearBiometric } from "@/lib/security/biometric"
import { hypaConfirm } from "@/components/ui/hypa-notif"
import { apiFetch } from "@/lib/http/fetch"
import { errorMessage } from "@/lib/errors"
import { type PreferencesUser, resolveTier } from "./shared"
import { SettingsCard } from "./settings-card"

export function SecurityTab({ user }: { user: PreferencesUser }) {
  const tier = resolveTier(user)
  const isPaid = tier !== "free"

  const [purgeDays, setPurgeDays] = useState(7)
  const [purgeSaving, setPurgeSaving] = useState(false)
  const [purgeSaved, setPurgeSaved] = useState(false)
  const [purgeError, setPurgeError] = useState<string | null>(null)

  const [bioSupported, setBioSupported] = useState(false)
  const [bioEnrolled, setBioEnrolled] = useState(false)

  const [clearingSessions, setClearingSessions] = useState(false)
  const [sessionsMsg, setSessionsMsg] = useState<string | null>(null)

  useEffect(() => {
    isBiometricSupported().then((ok) => {
      setBioSupported(ok)
      setBioEnrolled(ok && isBiometricEnrolled())
    })
  }, [])

  const handleRemoveBio = async () => {
    const confirmed = await hypaConfirm({
      title: "Remove biometric unlock?",
      description: "You'll need your passkey to sign in on this device again. Your account isn't affected.",
      confirmText: "Remove",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    clearBiometric()
    setBioEnrolled(false)
  }

  const handleClearSessions = async () => {
    const confirmed = await hypaConfirm({
      title: "Clear previous sessions?",
      description: "Signs you out on every other device. You'll stay signed in here.",
      confirmText: "Clear sessions",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    setSessionsMsg(null)
    setClearingSessions(true)
    try {
      const res = await apiFetch("/api/v2/auth/clear-sessions", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      setSessionsMsg(
        data.revoked > 0
          ? `Cleared ${data.revoked} other session${data.revoked === 1 ? "" : "s"}.`
          : "No other sessions were active.",
      )
    } catch (err) {
      setSessionsMsg(errorMessage(err))
    } finally {
      setClearingSessions(false)
    }
  }

  useEffect(() => {
    if (user.inactivityPurgeDays) {
      setPurgeDays(user.inactivityPurgeDays)
    }
  }, [user.inactivityPurgeDays])

  const handlePurgeSelect = async (days: number) => {
    if (days === purgeDays) return
    setPurgeError(null)
    setPurgeSaving(true)
    try {
      const res = await apiFetch("/api/v2/auth/inactivity-purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      setPurgeDays(days)
      setPurgeSaved(true)
      setTimeout(() => setPurgeSaved(false), 2000)
    } catch (err) {
      setPurgeError(errorMessage(err))
    } finally {
      setPurgeSaving(false)
    }
  }

  // Preset expiration choices (1–365 days); include the stored value if custom.
  const purgeBase = [1, 3, 7, 14, 30, 60, 90, 180, 365]
  const purgeDayList = purgeBase.includes(purgeDays) ? purgeBase : [...purgeBase, purgeDays].sort((a, b) => a - b)
  const purgeOptions = purgeDayList.map((d) => ({ value: d, label: `${d} day${d === 1 ? "" : "s"}` }))

  return (
    <div className="space-y-4">
      {bioSupported && (
        <SettingsCard>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <MIcon name="fingerprint" size={20} className="mt-0.5 text-muted" />
              <div>
                <Typography type="body" weight="semibold" className="text-foreground">Biometric unlock</Typography>
                <Typography type="body-sm" color="muted" className="mt-0.5 leading-relaxed">
                  {bioEnrolled
                    ? "Enabled on this device."
                    : "Enable it the next time you sign in on this device."}
                </Typography>
              </div>
            </div>
            {bioEnrolled && (
              <Button variant="danger" size="sm" onPress={handleRemoveBio} style={{ flexShrink: 0 }}>
                Remove
              </Button>
            )}
          </div>
        </SettingsCard>
      )}

      <SettingsCard>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <MIcon name="devices" size={20} className="mt-0.5 text-muted" />
            <div>
              <Typography type="body" weight="semibold" className="text-foreground">Previous sessions</Typography>
              <Typography type="body-sm" color="muted" className="mt-0.5 leading-relaxed">
                {sessionsMsg ?? "Sign out of every other device. This one stays signed in."}
              </Typography>
            </div>
          </div>
          <Button variant="danger" size="sm" onPress={handleClearSessions} isDisabled={clearingSessions} style={{ flexShrink: 0 }}>
            {clearingSessions ? "..." : "Clear"}
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <MIcon name="auto_delete" size={20} className="mt-0.5 text-muted" />
            <div>
              <Typography type="body" weight="semibold" className="text-foreground">Inactivity purge</Typography>
              <Typography type="body-sm" color="muted" className="mt-0.5 leading-relaxed">
                {isPaid ? "Delete files after this many idle days." : "Fixed at 7 days on free. Upgrade to customize."}
              </Typography>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {purgeSaved && <MIcon name="check_circle" size={18} className="text-success" />}
            <Dropdown
              size="sm"
              direction="up"
              value={purgeDays}
              onChange={handlePurgeSelect}
              options={purgeOptions}
              disabled={!isPaid || purgeSaving}
              aria-label="Inactivity purge period"
              style={{ width: 124 }}
            />
          </div>
        </div>
        {purgeError && (
          <Typography type="body-xs" className="text-danger mt-2">{purgeError}</Typography>
        )}
      </SettingsCard>
    </div>
  )
}
