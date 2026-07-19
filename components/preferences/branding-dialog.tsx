"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ShineButton } from "@/components/ui/shine-button"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { TextInput } from "@/components/ui/text-input"
import { MIcon } from "@/components/ui/material-icon"
import { Loader } from "@/components/ui/loader"
import { AlertMessage } from "@/components/ui/alert-message"
import { useManage } from "@/hooks/useManage"
import { MAX_BANNER_SIZE } from "@/constants"
import { DISPLAY_NAME_CHANGE_COOLDOWN_MS } from "@/constants/profile"
import { apiFetch } from "@/lib/http/fetch"
import { type PreferencesUser } from "./shared"

export function BrandingDialog({
  open,
  user,
  onClose,
}: {
  open: boolean
  user: PreferencesUser
  onClose: () => void
}) {
  const { refreshUser } = useManage()
  const [displayName, setDisplayName] = useState(user.displayName ?? "")
  const [uploading, setUploading] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setDisplayName(user.displayName ?? "")
      setError(null)
    }
  }, [open, user.displayName])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const nameChanged = displayName.trim() !== (user.displayName ?? "")
  const nameCooldownMs = user.displayNameChangedAt
    ? Math.max(0, new Date(user.displayNameChangedAt).getTime() + DISPLAY_NAME_CHANGE_COOLDOWN_MS - Date.now())
    : 0
  const nameCooldownDays = Math.ceil(nameCooldownMs / (24 * 60 * 60 * 1000))

  const handleBannerFile = async (file: File) => {
    if (!["image/jpeg", "image/png", "image/gif", "image/avif"].includes(file.type)) {
      setError("Only JPEG, PNG, GIF and AVIF are allowed.")
      return
    }
    if (file.size > MAX_BANNER_SIZE) {
      setError("Banner must be 10 MB or smaller.")
      return
    }
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("banner", file)
      const res = await apiFetch("/api/v2/auth/upload-banner", { method: "POST", body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || "Banner upload failed."); return }
      await refreshUser()
    } catch {
      setError("Banner upload failed.")
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (savingName) return
    if (!nameChanged) { onClose(); return }
    setError(null)
    setSavingName(true)
    try {
      const res = await apiFetch("/api/v2/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.message || data.error || "Couldn't save display name."); return }
      await refreshUser()
      onClose()
    } catch {
      setError("Couldn't save display name.")
    } finally {
      setSavingName(false)
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
            className="relative w-full max-w-[420px] flex flex-col bg-white dark:bg-[#121212] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] rounded-[16px]"
            style={{
              boxShadow: '0 16px 48px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)',
              padding: 6,
            }}
          >
            <div style={{ padding: '10px 6px 6px' }}>
              <p className="text-[#111] dark:text-[#f0f0f0]" style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', paddingLeft: 2, paddingBottom: 10 }}>Download page branding</p>

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/avif"
                disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBannerFile(f); e.target.value = "" }}
                className="hidden"
              />
              <ShineButton size="md" fullWidth onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? (
                  <span className="flex items-center justify-center gap-2"><Loader size={16} color="#ffffff" /> Uploading…</span>
                ) : (
                  <span className="flex items-center justify-center gap-2"><MIcon name="image" size={16} /> {user.bannerUrl ? "Change banner" : "Upload banner"}</span>
                )}
              </ShineButton>

              <p className="text-[12px] font-medium text-[#888] dark:text-[#898e97] mt-4 mb-1.5">Display name</p>
              <TextInput
                type="text"
                size="md"
                fullWidth
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.replace(/[^A-Za-z0-9 ._-]/g, "").slice(0, 32))}
                placeholder="yourname"
                leading={<span className="text-[13px] shrink-0">@</span>}
                style={{ fontWeight: 500, paddingLeft: 2 }}
              />
              {nameCooldownMs > 0 ? (
                <p className="text-[11px] text-[#888] dark:text-[#898e97] mt-2">You can change your display name again in {nameCooldownDays === 1 ? "1 day" : `${nameCooldownDays} days`}.</p>
              ) : (
                <p className="text-[11px] text-[#999] dark:text-[#6b6b6b] mt-2">Unique across Hypastack, changeable once every 7 days.</p>
              )}
            </div>

            {error && (
              <div style={{ padding: '0 6px 6px' }}>
                <AlertMessage tone="error" style={{ marginBottom: 0 }}>{error}</AlertMessage>
              </div>
            )}

            <div className="flex gap-2" style={{ padding: 4 }}>
              <div className="flex-1">
                <SecondaryButton size="md" fullWidth onClick={onClose}>Close</SecondaryButton>
              </div>
              <div className="flex-1">
                <ShineButton size="md" fullWidth onClick={handleSave} disabled={savingName || !nameChanged || nameCooldownMs > 0}>
                  {savingName ? (
                    <span className="flex items-center justify-center gap-2"><Loader size={16} color="#ffffff" /> Saving…</span>
                  ) : "Save name"}
                </ShineButton>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
