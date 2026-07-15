"use client"

import { useState } from "react"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { ToggleSwitch } from "@/components/ui/toggle-switch"
import { hypaConfirm } from "@/components/ui/hypa-notif"
import { useManage } from "@/hooks/useManage"
import { apiFetch } from "@/lib/http/fetch"
import { BrandingDialog } from "./branding-dialog"
import { type PreferencesUser } from "./shared"

// Paid-plan branding for the download page: a banner + public @display name that
// appear above every file the user shares. Configured through a modal; the
// toggle turns it off by clearing both.
export function BrandingSection({ user }: { user: PreferencesUser }) {
  const { refreshUser } = useManage()
  const [modalOpen, setModalOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  const active = !!user.bannerUrl || !!user.displayName

  // Turning it on opens the modal (it flips on once something is saved). Turning
  // off clears the banner and display name.
  const handleToggle = async (v: boolean) => {
    if (v) {
      setModalOpen(true)
      return
    }
    const confirmed = await hypaConfirm({
      title: "Remove download-page branding?",
      description: "Deletes your banner and clears your display name.",
      confirmText: "Remove",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    setRemoving(true)
    try {
      if (user.bannerUrl) {
        await apiFetch("/api/v2/auth/delete-banner", { method: "POST" })
      }
      if (user.displayName) {
        await apiFetch("/api/v2/auth/update-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ display_name: "" }),
        })
      }
      await refreshUser()
    } catch {
      /* best-effort; refreshUser reflects whatever actually cleared */
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]" style={{ borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0]">Download page branding</p>
          <p className="text-[12px] text-[#666] dark:text-[#898e97] mt-0.5 leading-relaxed">A banner and name shown above every file you share.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {active && (
            <SecondaryButton size="sm" onClick={() => setModalOpen(true)}>Edit</SecondaryButton>
          )}
          <ToggleSwitch checked={active} onChange={handleToggle} disabled={removing} aria-label="Download page branding" />
        </div>
      </div>

      <BrandingDialog open={modalOpen} user={user} onClose={() => setModalOpen(false)} />
    </div>
  )
}
