"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ShineButton } from "@/components/ui/shine-button"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { TextInput } from "@/components/ui/text-input"
import { Loader } from "@/components/ui/loader"
import { AlertMessage } from "@/components/ui/alert-message"
import { useManage } from "@/hooks/useManage"
import { getSessionKey, encryptE2E } from "@/lib/security/cryptoClient"
import { apiFetch } from "@/lib/http/fetch"
import { NICKNAME_CHANGE_COOLDOWN_MS } from "@/constants/profile"
import { errorMessage } from "@/lib/errors"
import { type PreferencesUser } from "./shared"

export function EditProfileDialog({
  open,
  user,
  onClose,
}: {
  open: boolean
  user: PreferencesUser
  onClose: () => void
}) {
  const { refreshUser } = useManage()
  const [nickname, setNickname] = useState(user.nickname)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setNickname(user.nickname)
      setError(null)
    }
  }, [open, user.nickname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  // Username policy: letters/numbers only, no spaces or symbols, 3–12 chars.
  const nicknameError =
    nickname.length === 0 ? "" :
    /\s/.test(nickname) ? "No spaces allowed." :
    !/^[A-Za-z0-9]*$/.test(nickname) ? "Letters and numbers only — no symbols." :
    nickname.length < 3 ? "Must be at least 3 characters." :
    nickname.length > 12 ? "Must be 12 characters or fewer." : ""
  const isNicknameValid = /^[A-Za-z0-9]{3,12}$/.test(nickname)
  const nickChanged = nickname.trim() !== user.nickname
  const nickCooldownMs = user.nicknameChangedAt
    ? Math.max(0, new Date(user.nicknameChangedAt).getTime() + NICKNAME_CHANGE_COOLDOWN_MS - Date.now())
    : 0
  const nickCooldownDays = Math.ceil(nickCooldownMs / (24 * 60 * 60 * 1000))
  const nickCooldownLocked = nickChanged && nickCooldownMs > 0

  const handleSave = async () => {
    if (saving) return
    if (!isNicknameValid) return
    if (nickname.trim() === user.nickname) {
      onClose()
      return
    }
    setSaving(true)
    setError(null)
    try {
      const sessionKey = await getSessionKey()
      if (!sessionKey) {
        setError("We couldn't find your session key, please log out and log in, then retry.")
        return
      }
      
      const nickname_encrypted = await encryptE2E(nickname.trim(), sessionKey)

      const res = await apiFetch("/api/v2/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname_encrypted }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || data.error || "Profile update failed, contact us at t.me/hypastack")
        return
      }
      await refreshUser()
      onClose()
    } catch (err) {
      setError(errorMessage(err, "Well.. something got tangled up, try again later."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[420px] flex flex-col bg-white dark:bg-[#0e0f10] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] rounded-[16px]"
            style={{
              boxShadow: '0 16px 48px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)',
              padding: 6,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !saving) handleSave()
            }}
          >
            <div style={{ padding: '10px 14px 6px' }}>
              <p className="text-[#111] dark:text-[#f0f0f0]" style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', paddingBottom: 8 }}>Username</p>
              <TextInput
                type="text"
                size="md"
                fullWidth
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                autoFocus
                style={{ height: 46, fontWeight: 500, fontSize: 15 }}
              />
              {nicknameError && (
                <p className="text-[11px] text-red-500 mt-2">{nicknameError}</p>
              )}
              {!nicknameError && nickCooldownMs > 0 && (
                <p className="text-[11px] text-[#888] dark:text-[#898e97] mt-2">You can change your username again in {nickCooldownDays === 1 ? "1 day" : `${nickCooldownDays} days`}.</p>
              )}
            </div>

            {error && (
              <div style={{ padding: '0 6px 6px' }}>
                <AlertMessage tone="error" style={{ marginBottom: 0 }}>{error}</AlertMessage>
              </div>
            )}

            <div className="flex gap-2" style={{ padding: 4 }}>
              <div className="flex-1">
                <SecondaryButton size="md" fullWidth onClick={onClose} disabled={saving}>
                  Cancel
                </SecondaryButton>
              </div>
              <div className="flex-1">
                <ShineButton
                  size="md"
                  fullWidth
                  onClick={handleSave}
                  disabled={saving || !isNicknameValid || nickCooldownLocked}
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader size={16} color="#ffffff" />
                      Saving...
                    </span>
                  ) : "Save"}
                </ShineButton>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
