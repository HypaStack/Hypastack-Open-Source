"use client"

import { useState } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { ShineButton } from "@/components/ui/shine-button"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { TextInput } from "@/components/ui/text-input"
import { useManage } from "@/hooks/useManage"
import { MAX_BANNER_SIZE } from "@/constants"
import { apiFetch } from "@/lib/http/fetch"
import { DISPLAY_NAME_CHANGE_COOLDOWN_MS } from "@/constants/profile"
import { type PreferencesUser } from "./shared"

// Paid-plan branding for the download page: a banner + public @display name that
// appear above every file the user shares. Mirrors the avatar upload flow.
export function BrandingSection({ user }: { user: PreferencesUser }) {
  const { refreshUser } = useManage()
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [displayName, setDisplayName] = useState(user.displayName ?? "")
  const [savingName, setSavingName] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const handleRemoveBanner = async () => {
    setError(null)
    setRemoving(true)
    try {
      const res = await apiFetch("/api/v2/auth/delete-banner", { method: "POST" })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || "Couldn't remove banner.")
        return
      }
      await refreshUser()
    } catch {
      setError("Couldn't remove banner.")
    } finally {
      setRemoving(false)
    }
  }

  const handleSaveName = async () => {
    if (savingName || !nameChanged) return
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
    } catch {
      setError("Couldn't save display name.")
    } finally {
      setSavingName(false)
    }
  }

  return (
    <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)] flex flex-col" style={{ borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
      <p className="text-[14px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0] mb-1">Download page</p>
      <p className="text-[13px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] mb-4 font-normal leading-snug">
        A banner and name shown above every file you share.
      </p>

      <div className="flex items-center gap-2">
        <label className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150 cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)] group-hover:to-[rgba(255,255,255,0.25)] transition-colors duration-300" />
          <div className="relative bg-[#151616] rounded-full h-[32px] px-4 flex items-center gap-1.5 text-[#f7f8f8] text-[13px] font-medium">
            <MIcon name="image" size={14} />
            {user.bannerUrl ? "Change banner" : "Upload banner"}
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/avif"
            disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBannerFile(f); e.target.value = "" }}
            className="hidden"
          />
        </label>
        {user.bannerUrl && (
          <SecondaryButton
            variant="ghost"
            size="sm"
            onClick={handleRemoveBanner}
            disabled={removing}
            style={{ borderRadius: 9999 }}
          >
            {removing ? "Removing..." : "Remove"}
          </SecondaryButton>
        )}
      </div>

      <p className="text-[12px] font-medium text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] mt-4 mb-1.5">Display name</p>
      <div className="flex items-center gap-2">
        <TextInput
          type="text"
          size="md"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value.replace(/[^A-Za-z0-9 ._-]/g, "").slice(0, 32))}
          placeholder="yourname"
          wrapperClassName="flex-1"
          leading={<span className="text-[13px] shrink-0">@</span>}
          style={{ height: 36, fontWeight: 500, paddingLeft: 2 }}
          wrapperStyle={{ height: 36 }}
        />
        <ShineButton
          size="sm"
          onClick={handleSaveName}
          disabled={savingName || !nameChanged || nameCooldownMs > 0}
        >
          {savingName ? "Saving..." : "Save"}
        </ShineButton>
      </div>

      {nameCooldownMs > 0 ? (
        <p className="text-[11px] text-[#888] dark:text-[#898e97] mt-2">You can change your display name again in {nameCooldownDays === 1 ? "1 day" : `${nameCooldownDays} days`}.</p>
      ) : (
        <p className="text-[11px] text-[#999] dark:text-[#6b6b6b] mt-2">Unique across Hypastack, changeable once every 7 days.</p>
      )}
      {error && <p className="text-[11px] text-red-500 mt-2">{error}</p>}
    </div>
  )
}
