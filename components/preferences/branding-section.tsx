"use client"

import { useState } from "react"
import { Button, Switch, Typography } from "@heroui/react"
import { hypaConfirm } from "@/components/ui/hypa-notif"
import { useManage } from "@/hooks/useManage"
import { apiFetch } from "@/lib/http/fetch"
import { BrandingDialog } from "./branding-dialog"
import { SettingsCard } from "./settings-card"
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
    <SettingsCard className="mb-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <Typography type="body" weight="semibold" className="text-foreground">Download page branding</Typography>
          <Typography type="body-sm" color="muted" className="mt-0.5 leading-relaxed">A banner and name shown above every file you share.</Typography>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {active && (
            <Button variant="tertiary" size="sm" onPress={() => setModalOpen(true)}>Edit</Button>
          )}
          <Switch isSelected={active} onChange={handleToggle} isDisabled={removing} aria-label="Download page branding">
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </div>
      </div>

      <BrandingDialog open={modalOpen} user={user} onClose={() => setModalOpen(false)} />
    </SettingsCard>
  )
}
