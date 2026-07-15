"use client"

import { useState } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { ShineButton } from "@/components/ui/shine-button"
import { ProgressBar } from "@/components/ui/progress-bar"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { useManage } from "@/hooks/useManage"
import { hypaConfirm } from "@/components/ui/hypa-notif"
import { API_BASE, MAX_AVATAR_SIZE } from "@/constants"
import { apiFetch } from "@/lib/http/fetch"
import { type PreferencesTab, type PreferencesUser, type PreferencesStorage, formatBytes, formatStoragePct } from "./shared"
import { AvatarCropperModal } from "./avatar-cropper"
import { BrandingSection } from "./branding-section"
import { EditProfileDialog } from "./edit-profile-dialog"

export function AccountTab({ user, storage, onSwitchTab }: { user: PreferencesUser; storage: PreferencesStorage | null; onSwitchTab?: (tab: PreferencesTab) => void }) {
  const { refreshUser, files, setFiles, logout } = useManage()
  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [avatarKey, setAvatarKey] = useState(0)
  const avatarSrc = user.avatarUrl ? `${API_BASE}/avatar?t=${avatarKey}` : 'https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp'
  const initials = (user.nickname || "?").charAt(0).toUpperCase()
  const usedPct = storage?.storagePercent ?? 0

  const [cropFile, setCropFile] = useState<{ url: string; file: File } | null>(null)
  const [trashLoading, setTrashLoading] = useState(false)
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false)

  const handleEmptyTrash = async () => {
    if (files.length === 0) return
    const confirmed = await hypaConfirm({
      title: `Delete all ${files.length} file(s) permanently?`,
      description: "This will wipe every file in your Drive. This cannot be undone.",
      items: files.slice(0, 10).map(f => f.name),
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
      description: "All files, CDN assets, and your account will be permanently erased. This cannot be undone.",
      items: [],
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
  const uploadRawAvatar = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("avatar", file)
      const res = await apiFetch("/api/v2/auth/upload-avatar", { method: "POST", body: fd })
      if (res.ok) await handleUploadSuccess()
    } catch (e) {
      console.error("[Avatar] GIF upload failed:", e)
    } finally {
      setUploading(false)
    }
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
    <div>

      <div className="flex flex-col sm:flex-row sm:items-center items-start gap-4 sm:gap-5 mb-4 bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]" style={{ borderRadius: 12, padding: '12px 16px' }}>
        <div className="relative h-[84px] w-[84px] shrink-0">
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <img decoding="async"
              src={avatarSrc}
              alt={user.nickname}
              className="absolute inset-0 w-full h-full object-cover rounded-full select-none pointer-events-none"
              draggable={false}
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp' }}
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                <LoadingSvg variant="white" size={22} />
              </div>
            )}
          </div>
          <label
            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white dark:bg-[#2c2c30] flex items-center justify-center text-[#555] dark:text-[#e3e3e3] hover:text-[#111] dark:hover:text-white hover:bg-[#f0f0f0] dark:hover:bg-[#3a3a3b] hover:scale-105 active:scale-95 transition-all duration-200 z-10 cursor-pointer shadow-sm"
            aria-label="Change avatar"
          >
            <MIcon name="photo_camera" size={16} />
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
          <div className="flex items-center gap-1.5">
            <p className="text-[22px] font-semibold text-[#111] dark:text-white dark:text-[#f0f0f0] truncate max-w-[calc(100%-20px)]">{user.nickname}</p>
          </div>
          <div className="mt-auto pt-2 flex gap-2">
            <SecondaryButton
              size="xs"
              onClick={() => {
                navigator.clipboard.writeText(user.id)
                setCopiedId(true)
                setTimeout(() => setCopiedId(false), 2000)
              }}
              style={{ height: 26, gap: 6, borderRadius: 9999 }}
            >
              <MIcon name={copiedId ? "check" : "content_copy"} size={13} />
              {copiedId ? "Copied" : "Copy user ID"}
            </SecondaryButton>
            <SecondaryButton
              size="xs"
              onClick={() => setEditing(true)}
              style={{ height: 26, gap: 6, borderRadius: 9999 }}
            >
              <MIcon name="edit" size={13} />
              Edit
            </SecondaryButton>
          </div>
        </div>
      </div>

      <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]" style={{ borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <p className="text-[28px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0] tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
              {storage ? formatBytes(storage.totalStorage) : "Loading"}
            </p>
            <p className="text-[12px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] font-normal">Space used ({formatStoragePct(usedPct)}%)</p>
          </div>
          <div className="border-t sm:border-t-0 sm:border-l border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] pt-4 sm:pt-0 sm:pl-6">
            <p className="text-[28px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0] tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
              {storage ? formatBytes(storage.maxStorage) : "Loading"}
            </p>
            <p className="text-[12px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] font-normal">Total space</p>
          </div>
        </div>
        <ProgressBar value={usedPct} className="mt-4" aria-label="Storage used" />
        <div className="mt-2.5 flex items-center gap-4 text-[12px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] font-normal">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#2680bf]" /> Drive
          </span>
        </div>
      </div>

      {!user.premium && (
        <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)] grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
          <div>
            <p className="text-[15px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0] mb-1.5">Upgrade</p>
            <p className="text-[13px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] mb-3 font-normal leading-snug">Level up your storage space and get many other benefits</p>
            <ShineButton size="md" onClick={() => onSwitchTab?.("plans")} style={{ height: 36 }}>
              Upgrade
            </ShineButton>
          </div>
          <div className="border-t sm:border-t-0 sm:border-l border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] pt-4 sm:pt-0 sm:pl-4">
            <p className="text-[15px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0] mb-1.5">Empty trash</p>
            <p className="text-[13px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] mb-3 font-normal leading-snug">Items in trash will be deleted permanently</p>
            <SecondaryButton
              size="md"
              onClick={handleEmptyTrash}
              disabled={trashLoading || files.length === 0}
              style={{ height: 36 }}
            >
              {trashLoading ? "Deleting..." : "Empty trash"}
            </SecondaryButton>
          </div>
        </div>
      )}

      {user.premium && <BrandingSection user={user} />}

      <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)] flex flex-col" style={{ borderRadius: 12, padding: '12px 16px' }}>
        <div>
          <p className="text-[14px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0] mb-1">Delete account</p>
          <p className="text-[13px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa]">
            All data will be permanently erased. This cannot be undone.
          </p>
        </div>
        <div className="pt-4 flex justify-end">
          <ShineButton
            size="sm"
            onClick={handleDeleteAccount}
            disabled={deleteAccountLoading}
            color="#dc2626"
            hoverColor="#b91c1c"
          >
            {deleteAccountLoading ? "Deleting..." : "Delete account"}
          </ShineButton>
        </div>
      </div>
    </div>
    <EditProfileDialog open={editing} user={user} onClose={() => setEditing(false)} />
    </>
  )
}
