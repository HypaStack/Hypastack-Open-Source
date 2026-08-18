"use client"

import { useState } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { Button, ProgressBar, Switch, Typography, toast } from "@heroui/react"
import { useManage } from "@/hooks/useManage"
import { useDeveloperMode } from "@/hooks/useDeveloperMode"
import { hypaConfirm } from "@/components/ui/hypa-notif"
import { API_BASE, MAX_AVATAR_SIZE, isPaidTier } from "@/constants"
import { apiFetch } from "@/lib/http/fetch"
import { errorMessage } from "@/lib/errors"
import { type PreferencesTab, type PreferencesUser, type PreferencesStorage, resolveTier } from "./shared"
import { formatBytes } from "@/lib/format"
import { PaidOnlyNotice } from "./paid-only-notice"
import { AvatarCropperModal, uploadAvatar } from "./avatar-cropper"
import { BrandingSection } from "./branding-section"
import { EditProfileDialog } from "./edit-profile-dialog"
import { SettingsCard } from "./settings-card"

export function AccountTab({ user, storage, onSwitchTab }: { user: PreferencesUser; storage: PreferencesStorage | null; onSwitchTab?: (tab: PreferencesTab) => void }) {
  const { refreshUser, files, setFiles, logout } = useManage()
  const { developerMode, setDeveloperMode } = useDeveloperMode()
  const devUnlocked = isPaidTier(resolveTier(user))
  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [avatarKey, setAvatarKey] = useState(0)
  const avatarSrc = user.avatarUrl ? `${API_BASE}/avatar?t=${avatarKey}` : 'https://r2.hypastack.com/cdn/hypadefaultprofilepicture/default-pfp.jpg'
  const usedPct = storage?.storagePercent ?? 0

  const [cropFile, setCropFile] = useState<{ url: string; file: File } | null>(null)
  const [trashLoading, setTrashLoading] = useState(false)
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false)

  const handleEmptyTrash = async () => {
    if (files.length === 0) return
    const confirmed = await hypaConfirm({
      title: `Delete all ${files.length} file(s) permanently?`,
      description: "This will wipe every file in your Drive. This cannot be undone.",
      confirmText: "Wipe all",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    setTrashLoading(true)
    try {
      const res = await apiFetch("/api/v2/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: files.map(f => f.id) }),
      })
      if (res.ok) {
        setFiles([])
        await refreshUser()
      }
    } catch (err) {
      console.error("Empty trash error:", err)
    } finally {
      setTrashLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmed = await hypaConfirm({
      title: "Delete your account permanently?",
      description: "All files, Edge assets, and your account will be permanently erased. This cannot be undone.",
      confirmText: "Delete forever",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    setDeleteAccountLoading(true)
    try {
      const res = await apiFetch("/api/v2/auth/delete-account", { method: "DELETE" })
      if (res.ok) {
        await logout()
      }
    } catch (err) {
      console.error("Delete account error:", err)
    } finally {
      setDeleteAccountLoading(false)
    }
  }

  const handleUploadSuccess = async () => {
    await refreshUser()
    setAvatarKey(k => k + 1)
  }

  // GIF avatars can't be cropped on a canvas without flattening to one frame,
  // so they skip the cropper and upload as-is to keep the animation.
  const uploadRawAvatar = (file: File) => {
    setUploading(true)
    const uploaded = uploadAvatar(file).then(handleUploadSuccess)
    toast.promise(uploaded, {
      loading: "Updating profile picture…",
      success: "Profile picture updated",
      error: (err) => errorMessage(err, "Couldn't change your profile picture."),
    })
    uploaded.catch(() => {}).finally(() => setUploading(false))
  }

  return (
    <>
    {cropFile && (
      <AvatarCropperModal
        imageSrc={cropFile.url}
        file={cropFile.file}
        onClose={() => setCropFile(null)}
        onUploadSuccess={handleUploadSuccess}
      />
    )}
    <div className="space-y-4">

      <SettingsCard>
        <div className="flex flex-col sm:flex-row sm:items-center items-start gap-4 sm:gap-5">
          <div className="relative h-[84px] w-[84px] shrink-0">
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <img decoding="async"
                src={avatarSrc}
                alt={user.nickname}
                className="absolute inset-0 w-full h-full object-cover rounded-full select-none pointer-events-none"
                draggable={false}
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://r2.hypastack.com/cdn/hypadefaultprofilepicture/default-pfp.jpg' }}
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                  <LoadingSvg variant="white" size={22} />
                </div>
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 z-10 cursor-pointer" aria-label="Change avatar">
              <Button variant="tertiary" isIconOnly size="sm" className="pointer-events-none rounded-full shadow-sm" style={{ width: 32, height: 32 }}>
                <MIcon name="photo_camera" size={16} />
              </Button>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f && ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type) && f.size <= MAX_AVATAR_SIZE) {
                    if (f.type === "image/gif") {
                      uploadRawAvatar(f)
                    } else {
                      setCropFile({ url: URL.createObjectURL(f), file: f })
                    }
                  }
                  e.target.value = ""
                }}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <Typography type="body" weight="semibold" className="text-3xl text-foreground truncate max-w-[calc(100%-20px)]">{user.nickname}</Typography>
            <div className="mt-auto pt-2 flex gap-2">
              <Button
                variant="tertiary"
                size="sm"
                onPress={() => {
                  navigator.clipboard.writeText(user.id)
                  setCopiedId(true)
                  setTimeout(() => setCopiedId(false), 2000)
                }}
                style={{ height: 26, gap: 6 }}
              >
                <MIcon name={copiedId ? "check" : "content_copy"} size={13} />
                {copiedId ? "Copied" : "Copy user ID"}
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                onPress={() => setEditing(true)}
                style={{ height: 26, gap: 6 }}
              >
                <MIcon name="edit" size={13} />
                Edit
              </Button>
            </div>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard>
        <div className="flex items-center justify-between mb-2">
          <Typography type="body" weight="semibold" className="text-foreground">Storage used</Typography>
          <Typography type="body-sm" color="muted" style={{ fontVariantNumeric: "tabular-nums" }}>
            {storage ? `${formatBytes(storage.totalStorage)} of ${formatBytes(storage.maxStorage)}` : "Loading"}
          </Typography>
        </div>
        <ProgressBar value={usedPct} aria-label="Storage used">
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </SettingsCard>

      {!user.premium && (
        <SettingsCard>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Typography type="body" weight="semibold" className="text-foreground mb-1.5">Upgrade</Typography>
              <Typography type="body-sm" color="muted" className="mb-3 leading-snug">Level up your storage space and get many other benefits</Typography>
              <Button variant="primary" size="md" onPress={() => onSwitchTab?.("plans")} style={{ height: 36 }}>
                Upgrade
              </Button>
            </div>
            <div className="border-t sm:border-t-0 sm:border-l border-separator pt-4 sm:pt-0 sm:pl-4">
              <Typography type="body" weight="semibold" className="text-foreground mb-1.5">Empty trash</Typography>
              <Typography type="body-sm" color="muted" className="mb-3 leading-snug">Items in trash will be deleted permanently</Typography>
              <Button
                variant="tertiary"
                size="md"
                onPress={handleEmptyTrash}
                isDisabled={trashLoading || files.length === 0}
                style={{ height: 36 }}
              >
                {trashLoading ? "Deleting..." : "Empty trash"}
              </Button>
            </div>
          </div>
        </SettingsCard>
      )}

      {user.premium && <BrandingSection user={user} />}

      <SettingsCard>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Typography type="body" weight="semibold" className="text-foreground">Developer mode</Typography>
            <Typography type="body-sm" color="muted" className="mt-0.5 leading-snug">
              Adds a Developer tab where you can create API keys and pick what they&apos;re allowed to do.
            </Typography>
          </div>
          <Switch isSelected={devUnlocked && developerMode} onChange={setDeveloperMode} isDisabled={!devUnlocked} aria-label="Developer mode">
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </div>
        {!devUnlocked && (
          <div className="mt-3">
            <PaidOnlyNotice onSwitchTab={onSwitchTab} />
          </div>
        )}
      </SettingsCard>

      <SettingsCard>
        <div>
          <Typography type="body" weight="semibold" className="text-foreground mb-1">Delete account</Typography>
          <Typography type="body-sm" color="muted">
            All data will be permanently erased. This cannot be undone.
          </Typography>
        </div>
        <div className="pt-4 flex justify-end">
          <Button
            variant="danger"
            size="sm"
            onPress={handleDeleteAccount}
            isDisabled={deleteAccountLoading}
          >
            {deleteAccountLoading ? "Deleting..." : "Delete account"}
          </Button>
        </div>
      </SettingsCard>
    </div>
    <EditProfileDialog open={editing} user={user} onClose={() => setEditing(false)} />
    </>
  )
}
