"use client"

import { useEffect, useState } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { ShineButton } from "@/components/ui/shine-button"
import { TextInput } from "@/components/ui/text-input"
import { isBiometricSupported, isBiometricEnrolled, clearBiometric } from "@/lib/security/biometric"
import { hypaConfirm } from "@/components/ui/hypa-notif"
import { apiFetch } from "@/lib/http/fetch"
import { errorMessage } from "@/lib/errors"
import { type PreferencesUser, resolveTier } from "./shared"

export function SecurityTab({ user }: { user: PreferencesUser }) {
  const tier = resolveTier(user)
  const isPaid = tier !== "free"

  const [purgeDays, setPurgeDays] = useState(7)
  const [purgeInput, setPurgeInput] = useState("7")
  const [purgeSaving, setPurgeSaving] = useState(false)
  const [purgeSaved, setPurgeSaved] = useState(false)
  const [purgeError, setPurgeError] = useState<string | null>(null)

  const [bioSupported, setBioSupported] = useState(false)
  const [bioEnrolled, setBioEnrolled] = useState(false)

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

  useEffect(() => {
    if (user.inactivityPurgeDays) {
      setPurgeDays(user.inactivityPurgeDays)
      setPurgeInput(String(user.inactivityPurgeDays))
    }
  }, [user.inactivityPurgeDays])

  const handlePurgeSave = async () => {
    setPurgeError(null)
    const val = parseInt(purgeInput, 10)
    if (isNaN(val) || val < 7 || val > 365) {
      setPurgeError("Must be between 7 and 365 days.")
      return
    }
    setPurgeSaving(true)
    try {
      const res = await apiFetch("/api/v2/auth/inactivity-purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: val }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      setPurgeDays(val)
      setPurgeSaved(true)
      setTimeout(() => setPurgeSaved(false), 2000)
    } catch (err) {
      setPurgeError(errorMessage(err))
    } finally {
      setPurgeSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]" style={{ borderRadius: 12, padding: '14px 16px' }}>
        <p className="text-[13px] text-[#666] dark:text-[#a1a1aa] dark:text-[#888] dark:text-[#898e97] leading-relaxed">
          Hypastack stores <span className="text-[#111] dark:text-white dark:text-[#f0f0f0] font-medium">hashed usernames</span>,{" "}
          <span className="text-[#111] dark:text-white dark:text-[#f0f0f0] font-medium">hashed access keys</span>,{" "}
          <span className="text-[#111] dark:text-white dark:text-[#f0f0f0] font-medium">encrypted files with random filenames</span>, and{" "}
          <span className="text-[#111] dark:text-white dark:text-[#f0f0f0] font-medium">metadata-stripped assets</span>.{" "}
          If you want me to change something up, lmk, i can think of something.
        </p>
      </div>

      {bioSupported && (
        <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-4" style={{ borderRadius: 12, padding: '16px 20px' }}>
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

      <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)] flex flex-col" style={{ borderRadius: 12, padding: '12px 20px' }}>
        <div className="flex items-center justify-between gap-4">
          <p className="text-[14px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0]">Inactivity purge</p>
          <div className="flex items-center gap-2">
            <TextInput
              type="number"
              size="md"
              min={7}
              max={365}
              value={purgeInput}
              onChange={(e) => {
                setPurgeInput(e.target.value)
                setPurgeError(null)
                setPurgeSaved(false)
              }}
              disabled={!isPaid}
              style={{ width: 88, height: 38, textAlign: "left", fontWeight: 500 }}
              placeholder="7"
            />
            <span className="text-[12px] text-[#aaa] mr-1">days</span>
            <ShineButton
              size="sm"
              onClick={handlePurgeSave}
              disabled={!isPaid || purgeSaving || purgeInput === String(purgeDays)}
              color={purgeSaved ? "#16a34a" : undefined}
              hoverColor={purgeSaved ? "#15803d" : undefined}
              style={{ height: 38 }}
            >
              {purgeSaved ? "Saved" : purgeSaving ? "..." : "Save"}
            </ShineButton>
          </div>
        </div>
        {purgeError && (
          <p className="text-[11px] text-red-500 pt-3">{purgeError}</p>
        )}
      </div>

      {!isPaid && (
        <p className="text-[11px] text-[#aaa] px-1">
          Fixed at <span className="text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] font-medium">7 days</span> for free accounts, Upgrade to customize.
        </p>
      )}
    </div>
  )
}
