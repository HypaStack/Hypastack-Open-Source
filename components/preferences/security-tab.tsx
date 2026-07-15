"use client"

import { useEffect, useState } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { ShineButton } from "@/components/ui/shine-button"
import { Dropdown } from "@/components/ui/dropdown"
import { isBiometricSupported, isBiometricEnrolled, clearBiometric } from "@/lib/security/biometric"
import { hypaConfirm } from "@/components/ui/hypa-notif"
import { apiFetch } from "@/lib/http/fetch"
import { errorMessage } from "@/lib/errors"
import { type PreferencesUser, resolveTier } from "./shared"

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
      description: "You'll need your identifier to sign in on this device again. Your account isn't affected.",
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
        <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-4" style={{ borderRadius: 12, padding: '12px 16px' }}>
          <div className="flex items-start gap-3">
            <MIcon name="fingerprint" size={20} className="mt-0.5 text-[#666] dark:text-[#898e97]" />
            <div>
              <p className="text-[14px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0]">Biometric unlock</p>
              <p className="text-[12px] text-[#666] dark:text-[#898e97] mt-0.5 leading-relaxed">
                {bioEnrolled
                  ? "Enabled on this device."
                  : "Enable it the next time you sign in on this device."}
              </p>
            </div>
          </div>
          {bioEnrolled && (
            <ShineButton size="sm" onClick={handleRemoveBio} color="#dc2626" hoverColor="#b91c1c" style={{ flexShrink: 0 }}>
              Remove
            </ShineButton>
          )}
        </div>
      )}

      <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-4" style={{ borderRadius: 12, padding: '12px 16px' }}>
        <div className="flex items-start gap-3">
          <MIcon name="devices" size={20} className="mt-0.5 text-[#666] dark:text-[#898e97]" />
          <div>
            <p className="text-[14px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0]">Previous sessions</p>
            <p className="text-[12px] text-[#666] dark:text-[#898e97] mt-0.5 leading-relaxed">
              {sessionsMsg ?? "Sign out of every other device. This one stays signed in."}
            </p>
          </div>
        </div>
        <ShineButton size="sm" onClick={handleClearSessions} disabled={clearingSessions} color="#dc2626" hoverColor="#b91c1c" style={{ flexShrink: 0 }}>
          {clearingSessions ? "..." : "Clear"}
        </ShineButton>
      </div>

      <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-4" style={{ borderRadius: 12, padding: '12px 16px' }}>
        <div className="flex items-start gap-3">
          <MIcon name="auto_delete" size={20} className="mt-0.5 text-[#666] dark:text-[#898e97]" />
          <div>
            <p className="text-[14px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0]">Inactivity purge</p>
            <p className="text-[12px] text-[#666] dark:text-[#898e97] mt-0.5 leading-relaxed">
              {isPaid ? "Delete files after this many idle days." : "Fixed at 7 days on free. Upgrade to customize."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {purgeSaved && <MIcon name="check_circle" size={18} className="text-[#16a34a]" />}
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
        <p className="text-[11px] text-red-500 px-1">{purgeError}</p>
      )}
    </div>
  )
}
