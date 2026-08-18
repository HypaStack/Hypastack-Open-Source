"use client"

import { useEffect, useRef, useState } from "react"
import { Button, Description, Input, InputGroup, Label, Modal, TextField, toast } from "@heroui/react"
import { MIcon } from "@/components/ui/material-icon"
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
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setDisplayName(user.displayName ?? "")
  }, [open, user.displayName])

  const [now] = useState(() => Date.now())
  const nameChanged = displayName.trim() !== (user.displayName ?? "")
  const nameCooldownMs = user.displayNameChangedAt
    ? Math.max(0, new Date(user.displayNameChangedAt).getTime() + DISPLAY_NAME_CHANGE_COOLDOWN_MS - now)
    : 0
  const nameCooldownDays = Math.ceil(nameCooldownMs / (24 * 60 * 60 * 1000))

  const uploadBanner = async (file: File) => {
    const fd = new FormData()
    fd.append("banner", file)
    const res = await apiFetch("/api/v2/auth/upload-banner", { method: "POST", body: fd })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || "Banner upload failed.")
    await refreshUser()
  }

  const handleBannerFile = (file: File) => {
    if (!["image/jpeg", "image/png", "image/gif", "image/avif"].includes(file.type)) {
      toast.danger("Only JPEG, PNG, GIF and AVIF are allowed.")
      return
    }
    if (file.size > MAX_BANNER_SIZE) {
      toast.danger("Banner must be 10 MB or smaller.")
      return
    }
    setUploading(true)
    const uploaded = uploadBanner(file)
    toast.promise(uploaded, {
      loading: "Uploading banner…",
      success: "Banner updated",
      error: (err) => err instanceof Error ? err.message : "Banner upload failed.",
    })
    uploaded.catch(() => {}).finally(() => setUploading(false))
  }

  const saveDisplayName = async () => {
    const res = await apiFetch("/api/v2/auth/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: displayName.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || data.error || "Couldn't save display name.")
    await refreshUser()
  }

  const handleSave = () => {
    if (savingName) return
    if (!nameChanged) { onClose(); return }
    setSavingName(true)
    const saved = saveDisplayName()
    toast.promise(saved, {
      loading: "Saving changes…",
      success: "Changes saved",
      error: (err) => err instanceof Error ? err.message : "Couldn't save display name.",
    })
    saved.then(onClose).catch(() => {}).finally(() => setSavingName(false))
  }

  return (
    <Modal isOpen={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <Modal.Backdrop isDismissable variant="blur">
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Download page branding</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body className="space-y-4">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/avif"
                disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBannerFile(f); e.target.value = "" }}
                className="hidden"
              />
              <Button variant="primary" fullWidth isPending={uploading} isDisabled={uploading} onPress={() => fileRef.current?.click()}>
                <MIcon name="image" size={16} />
                {uploading ? "Uploading…" : user.bannerUrl ? "Change banner" : "Upload banner"}
              </Button>

              <TextField
                value={displayName}
                onChange={(v) => setDisplayName(v.replace(/[^A-Za-z0-9 ._-]/g, "").slice(0, 32))}
                className="w-full"
              >
                <Label>Display name</Label>
                <InputGroup>
                  <InputGroup.Prefix>@</InputGroup.Prefix>
                  <InputGroup.Input placeholder="yourname" />
                </InputGroup>
                <Description>
                  {nameCooldownMs > 0
                    ? `You can change your display name again in ${nameCooldownDays === 1 ? "1 day" : `${nameCooldownDays} days`}.`
                    : "Unique across Hypastack, changeable once every 7 days."}
                </Description>
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={onClose}>Close</Button>
              <Button
                variant="primary"
                isPending={savingName}
                isDisabled={savingName || !nameChanged || nameCooldownMs > 0}
                onPress={handleSave}
              >
                {savingName ? "Saving…" : "Save name"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
