"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "motion/react"
import Cropper from "react-easy-crop"
import { MIcon } from "@/components/ui/material-icon"
import { useAuth } from "@/hooks/useAuth"
import { useTheme } from "@/hooks/useTheme"
import { useLanguage } from "@/hooks/useLanguage"
import { getSessionKey, encryptE2E } from "@/lib/crypto-client"
import { hypaConfirm } from "@/components/ui/hypa-notif"

export type PreferencesTab = "general" | "account" | "plans" | "billing" | "integrations" | "security"

export type PreferencesTier = "free" | "essential" | "premium" | "ultimate"

export interface PreferencesUser {
  id: string
  nickname: string
  avatarUrl: string | null
  premium: boolean
  tier?: PreferencesTier
  inactivityPurgeDays?: number
  is_insider?: number
}

const TIER_LABELS: Record<PreferencesTier, string> = {
  free: "Free",
  essential: "Essential",
  premium: "Premium",
  ultimate: "Ultimate",
}

const TIER_STORAGE: Record<PreferencesTier, string> = {
  free: "1 GB",
  essential: "300 GB",
  premium: "750 GB",
  ultimate: "1100 GB",
}

function resolveTier(user: PreferencesUser): PreferencesTier {
  return user.tier ?? (user.premium ? "essential" : "free")
}

export interface PreferencesStorage {
  totalStorage: number
  maxStorage: number
  storagePercent: number
}

interface Props {
  open: boolean
  initialTab?: PreferencesTab
  onClose: () => void
  user: PreferencesUser
  storage: PreferencesStorage | null
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "kB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export function PreferencesModal({ open, initialTab = "general", onClose, user, storage }: Props) {
  const [active, setActive] = useState<PreferencesTab>(initialTab)

  useEffect(() => {
    if (open) setActive(initialTab)
  }, [open, initialTab])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  const [mobileTabsOpen, setMobileTabsOpen] = useState(false)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 sm:p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative w-full h-full sm:w-full sm:max-w-[1060px] sm:h-[720px] sm:max-h-[92vh] flex flex-col pointer-events-auto"
              style={{
                backgroundColor: '#1f1f1f',
                borderRadius: 20,
                boxShadow: '0 0 0 1px rgba(255,255,255,0.04)',
                padding: 3,
              }}
            >
              <div className="flex flex-col sm:flex-row w-full h-full gap-[3px] overflow-hidden">
              {/* Mobile tab bar */}
              <div className="sm:hidden shrink-0 bg-[#111111] pt-3 pb-1 rounded-[17px]">
                <div className="flex gap-1 px-3 pb-2 overflow-x-auto no-scrollbar">
                  <TabButton active={active === "general"} onClick={() => setActive("general")} label="General" layoutIdPrefix="mobile" />
                  <TabButton active={active === "account"} onClick={() => setActive("account")} label="Account" layoutIdPrefix="mobile" />
                  <TabButton active={active === "plans"} onClick={() => setActive("plans")} label="Plans" layoutIdPrefix="mobile" />
                  <TabButton active={active === "billing"} onClick={() => setActive("billing")} label="Billing" layoutIdPrefix="mobile" />
                  <TabButton active={active === "integrations"} onClick={() => setActive("integrations")} label="Integrations" layoutIdPrefix="mobile" />
                  <TabButton active={active === "security"} onClick={() => setActive("security")} label="Security" layoutIdPrefix="mobile" />
                </div>
              </div>

              {/* Desktop left nav */}
              <div className="hidden sm:flex w-[210px] shrink-0 bg-[#111111] rounded-[17px] px-3 pt-6 pb-4 flex-col">
                <div className="space-y-0.5">
                  <TabButton active={active === "general"} onClick={() => setActive("general")} label="General" layoutIdPrefix="desktop" />
                  <TabButton active={active === "account"} onClick={() => setActive("account")} label="Account" layoutIdPrefix="desktop" />
                  <TabButton active={active === "plans"} onClick={() => setActive("plans")} label="Plans" layoutIdPrefix="desktop" />
                  <TabButton active={active === "billing"} onClick={() => setActive("billing")} label="Billing" layoutIdPrefix="desktop" />
                  <TabButton active={active === "integrations"} onClick={() => setActive("integrations")} label="Integrations" layoutIdPrefix="desktop" />
                  <TabButton active={active === "security"} onClick={() => setActive("security")} label="Security" layoutIdPrefix="desktop" />
                </div>
              </div>

              {/* Right content */}
              <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-[#111111] rounded-[17px] overflow-hidden">
                <div className="flex-1 overflow-y-auto px-4 sm:px-7 py-4 sm:py-6">
                  {active === "general" && <GeneralTab />}
                  {active === "account" && <AccountTab user={user} storage={storage} onSwitchTab={setActive} />}
                  {active === "plans" && <PlansTab user={user} onSwitchTab={setActive} />}
                  {active === "billing" && <BillingTab user={user} />}
                  {active === "integrations" && <IntegrationsTab />}
                  {active === "security" && <SecurityTab user={user} />}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </>
    )}
  </AnimatePresence>
  )
}

function tabTitle(tab: PreferencesTab): string {
  switch (tab) {
    case "general":
      return "General"
    case "account":
      return "Account"
    case "plans":
      return "Plans"
    case "billing":
      return "Billing"
    case "integrations":
      return "Integrations"
    case "security":
      return "Security"
  }
}

function TabButton({ active, onClick, label, layoutIdPrefix }: { active: boolean; onClick: () => void; label: string; layoutIdPrefix: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative sm:w-full text-left whitespace-nowrap shrink-0 transition-all duration-200 ${
        active
          ? "text-[#ffffff] font-medium"
          : "text-[#a1a1aa] hover:bg-[#313131] hover:text-[#e5e5eb] active:scale-[0.97] font-medium"
      }`}
      style={{
        height: 34,
        paddingLeft: 12,
        paddingRight: 12,
        borderRadius: 16,
        fontSize: 14,
      }}
    >
      {active && (
        <motion.div
          layoutId={`pref-tab-${layoutIdPrefix}`}
          className="absolute inset-0 bg-[#1f1f1f] rounded-[16px]"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h4 className="text-[16px] font-medium text-white mb-3">{title}</h4>
      {children}
    </section>
  )
}

function GeneralTab() {
  const { theme, setTheme } = useTheme()
  const { language, languages, setLanguage } = useLanguage()
  const [langOpen, setLangOpen] = useState(false)

  return (
    <div className="space-y-4">
      {/* Appearance */}
      <div style={{ borderRadius: 16, backgroundColor: '#171717', padding: '14px 16px' }}>
        <p className="text-[12px] font-medium text-[#555] mb-3">Appearance</p>
        <div className="grid grid-cols-3 gap-3 max-w-[520px]">
          <ThemeTile variant="system" label="System" active={theme === "system"} onClick={() => setTheme("system")} />
          <ThemeTile variant="light" label="Light" active={theme === "light"} onClick={() => setTheme("light")} />
          <ThemeTile variant="dark" label="Dark" active={theme === "dark"} onClick={() => setTheme("dark")} />
        </div>
      </div>

      {/* Language */}
      <div
        className="flex items-center justify-between cursor-pointer hover:bg-[#1a1a1a] transition-all duration-75"
        style={{ height: 38, paddingLeft: 12, paddingRight: 10, borderRadius: 14, backgroundColor: '#171717' }}
        onClick={() => setLangOpen((o) => !o)}
      >
        <span className="text-[13px] text-[#888]">Language</span>
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#e3e3e3]">
          {language.label} <span className="text-[#555]">({language.native})</span>
          <MIcon
            name="expand_more"
            size={15}
            className={`text-[#555] transition-transform ${langOpen ? "rotate-180" : ""}`}
          />
        </span>
      </div>
      {langOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setLangOpen(false)} />
          <div
            className="relative z-[110] -mt-2 w-full max-h-[280px] overflow-y-auto"
            style={{ padding: 4, borderRadius: 14, backgroundColor: '#1f1f1f' }}
          >
            {languages.map((l) => {
              const selected = l.code === language.code
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    setLanguage(l.code)
                    setLangOpen(false)
                  }}
                  className={`flex w-full items-center justify-between text-left transition-all duration-75 ${
                    selected
                      ? "text-white font-medium bg-[#9b9b9b]/10"
                      : "text-[#e3e3e3] hover:bg-[#1a1a1a] active:scale-[0.97]"
                  }`}
                  style={{ height: 34, paddingLeft: 12, paddingRight: 12, borderRadius: 10, fontSize: 13, border: 'none', cursor: 'pointer' }}
                >
                  <span>
                    {l.label} <span className="text-[#555]">({l.native})</span>
                  </span>
                  {selected && <MIcon name="check" size={15} className="text-[#9b9b9b]" />}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Support */}
      <a
        href="/help"
        className="flex items-center justify-between hover:bg-[#1a1a1a] transition-all duration-75"
        style={{ height: 38, paddingLeft: 12, paddingRight: 12, borderRadius: 14, backgroundColor: '#171717' }}
      >
        <span className="text-[13px] text-[#888]">Support</span>
        <span className="text-[13px] font-medium text-[#e3e3e3]">Open Support Centre →</span>
      </a>
    </div>
  )
}

function ThemeTile({
  variant,
  label,
  active,
  onClick,
}: {
  variant: "system" | "light" | "dark"
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        className={`relative w-full aspect-[5/3] rounded-[10px] overflow-hidden transition-all ${
          active
            ? "ring-2 ring-[#9b9b9b] ring-offset-0"
            : "ring-1 ring-[#3a3a3b] hover:ring-[#444446]"
        }`}
      >
        {variant === "system" && (
          <div className="absolute inset-0 grid grid-cols-2">
            <ThemeMock dark={false} />
            <ThemeMock dark />
          </div>
        )}
        {variant === "light" && <ThemeMock dark={false} />}
        {variant === "dark" && <ThemeMock dark />}
      </button>
      <span className={`text-[13px] ${active ? "font-medium text-white" : "font-normal text-[#a1a1aa]"}`}>
        {label}
      </span>
    </div>
  )
}

function ThemeMock({ dark }: { dark: boolean }) {
  const bg = dark ? "#18181b" : "#f5f5f5"
  const sidebar = dark ? "#0a0a0a" : "#e8e8e8"
  const block = dark ? "#2c2c30" : "#dcdcdc"
  return (
    <div className="h-full w-full flex" style={{ backgroundColor: bg }}>
      <div className="w-[28%] py-2 px-1.5 flex flex-col gap-1" style={{ backgroundColor: sidebar }}>
        <div className="h-1 rounded-full" style={{ backgroundColor: block, width: "70%" }} />
        <div className="h-1 rounded-full" style={{ backgroundColor: block, width: "55%" }} />
        <div className="h-1 rounded-full" style={{ backgroundColor: block, width: "65%" }} />
      </div>
      <div className="flex-1 p-2 flex flex-col gap-1.5">
        <div className="h-1 rounded-full" style={{ backgroundColor: block, width: "30%" }} />
        <div className="h-2 rounded-sm mt-1" style={{ backgroundColor: block }} />
        <div className="h-2 rounded-sm" style={{ backgroundColor: block, width: "75%" }} />
      </div>
    </div>
  )
}

function AvatarCropperModal({
  imageSrc,
  file,
  onClose,
  onUploadSuccess,
}: {
  imageSrc: string
  file: File
  onClose: () => void
  onUploadSuccess: () => void
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleUpload = async () => {
    if (!croppedAreaPixels) return

    try {
      // Crop the image while modal is still mounted (blob URL is still valid)
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("No 2d context")

      const image = new window.Image()
      image.src = imageSrc
      await new Promise((resolve, reject) => { 
        image.onload = resolve
        image.onerror = reject
      })

      const MAX = 512
      let w = croppedAreaPixels.width
      let h = croppedAreaPixels.height
      if (w > MAX || h > MAX) {
        const scale = MAX / Math.max(w, h)
        w = Math.round(w * scale)
        h = Math.round(h * scale)
      }

      canvas.width = w
      canvas.height = h

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        w,
        h
      )

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error("blob failed")), file.type === "image/png" ? "image/png" : "image/webp", 0.80)
      })

      const ext = file.type === "image/png" ? "png" : "webp"
      const uuid = (typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: any) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16))
      const cleanFile = new File([blob], `${uuid}.${ext}`, { type: blob.type })
      const fd = new FormData()
      fd.append("avatar", cleanFile)

      // Close modal now — image is already cropped, blob URL no longer needed
      onClose()

      // Fire-and-forget upload
      fetch("/api/v2/auth/upload-avatar", {
        method: "POST",
        body: fd,
      }).then(res => {
        if (res.ok) onUploadSuccess()
      }).catch(console.error)

    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
        onClick={onClose} 
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[420px] flex flex-col"
        style={{
          backgroundColor: '#1f1f1f',
          borderRadius: 20,
          boxShadow: '0 0 0 1px rgba(255,255,255,0.04)',
          padding: 3,
        }}
      >
        <div className="relative w-full flex flex-col" style={{ backgroundColor: '#111111', borderRadius: 17 }}>
        {/* Cropper */}
        <div className="relative w-full overflow-hidden" style={{ height: 400, borderRadius: 17 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            zoomSpeed={0.25}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        {/* Controls */}
        <div className="flex gap-1" style={{ marginTop: 4 }}>
          <button 
            onClick={onClose} 
            className="flex-1 flex items-center justify-center gap-1.5 hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75"
            style={{ height: 34, borderRadius: 16, fontSize: 14, fontWeight: 400, color: '#e3e3e3' }}
          >
            Cancel
          </button>
          <button 
            onClick={handleUpload} 
            className="flex-1 flex items-center justify-center gap-1.5 hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75"
            style={{ height: 34, borderRadius: 16, fontSize: 14, fontWeight: 500, color: '#ffffff' }}
          >
            Save
          </button>
        </div>
        </div>
      </motion.div>
    </div>
  )
}

function AccountTab({ user, storage, onSwitchTab }: { user: PreferencesUser; storage: PreferencesStorage | null; onSwitchTab?: (tab: PreferencesTab) => void }) {
  const { refreshUser, files, setFiles, logout } = useAuth()
  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [avatarSrc, setAvatarSrc] = useState(
    user.avatarUrl ? `/api/v2/avatar?t=${user.avatarUrl}` : null
  )
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
      const res = await fetch("/api/v2/files", {
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
      const res = await fetch("/api/v2/auth/delete-account", { method: "DELETE" })
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
    setAvatarSrc(`/api/v2/avatar?t=${Date.now()}`)
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

      <div className="flex items-center gap-5 mb-4" style={{ borderRadius: 16, backgroundColor: '#171717', padding: '16px 20px' }}>
        <div className="relative h-[84px] w-[84px] shrink-0">
          <div className="absolute inset-0 rounded-full overflow-hidden">
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt={user.nickname}
                fill
                sizes="84px"
                className="object-cover rounded-full select-none pointer-events-none"
                draggable={false}
                unoptimized
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-[#9b9b9b] text-white text-[24px] font-semibold rounded-full">
                {initials}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            )}
          </div>
          <label
            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-[#1f1f1f]/80 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white hover:bg-[#313131]/90 hover:scale-105 active:scale-95 transition-all duration-200 z-10 cursor-pointer shadow-lg"
            aria-label="Change avatar"
          >
            <MIcon name="photo_camera" size={16} />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => { 
                const f = e.target.files?.[0]; 
                console.log("[AvatarCrop] File selected:", f?.name, f?.type, f?.size)
                if (f && ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type) && f.size <= 10 * 1024 * 1024) {
                  const url = URL.createObjectURL(f)
                  console.log("[AvatarCrop] Setting cropFile, url:", url)
                  setCropFile({ url, file: f })
                } else {
                  console.log("[AvatarCrop] File rejected or no file")
                }
                e.target.value = "" 
              }}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[17px] font-medium text-white truncate max-w-[calc(100%-20px)]">{user.nickname}</p>
            {user.is_insider === 1 && (
              <MIcon name="verified" size={17} style={{ color: '#eab308' }} className="shrink-0" />
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(user.id)
              setCopiedId(true)
              setTimeout(() => setCopiedId(false), 2000)
            }}
            className="flex items-center gap-1.5 hover:text-white transition-colors active:scale-[0.97] mb-2 mt-0.5"
            style={{ fontSize: 12, fontWeight: 500, color: copiedId ? '#4ade80' : '#555' }}
          >
            <MIcon name={copiedId ? "check" : "content_copy"} size={13} /> 
            {copiedId ? "Copied!" : "Copy user ID"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 hover:bg-[#222] active:scale-[0.97] transition-all duration-75"
            style={{ height: 26, paddingLeft: 8, paddingRight: 8, borderRadius: 8, fontSize: 12, fontWeight: 500, color: '#e3e3e3', backgroundColor: '#1f1f1f' }}
          >
            <MIcon name="edit" size={13} />
            Edit
          </button>
        </div>
      </div>

      <div style={{ borderRadius: 16, backgroundColor: '#171717', padding: '14px 16px', marginBottom: 16 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <p className="text-[28px] font-medium text-white tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
              {storage ? formatBytes(storage.totalStorage) : "—"}
            </p>
            <p className="text-[12px] text-[#555] font-normal">Space used ({Math.round(usedPct)}%)</p>
          </div>
          <div className="border-t sm:border-t-0 sm:border-l border-[#2c2c30] pt-4 sm:pt-0 sm:pl-6">
            <p className="text-[28px] font-medium text-white tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
              {storage ? formatBytes(storage.maxStorage) : "—"}
            </p>
            <p className="text-[12px] text-[#555] font-normal">Total space</p>
          </div>
        </div>
        <div className="mt-4 h-1.5 w-full rounded-full bg-[#2c2c30] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#9b9b9b] transition-all duration-500"
            style={{ width: `${Math.min(100, usedPct)}%` }}
          />
        </div>
        <div className="mt-2.5 flex items-center gap-4 text-[12px] text-[#555] font-normal">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#9b9b9b]" /> Drive
          </span>
        </div>
      </div>

      {!user.premium && (
        <div style={{ borderRadius: 16, backgroundColor: '#171717', padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginBottom: 16 }}>
          <div>
            <p className="text-[15px] font-medium text-white mb-1.5">Upgrade</p>
            <p className="text-[13px] text-[#a1a1aa] mb-3 font-normal leading-snug">Level up your storage space and get many other benefits</p>
            <button
              onClick={() => onSwitchTab?.("plans")}
              className="inline-flex items-center hover:bg-[#7d7d7d] active:scale-[0.97] transition-all duration-75"
              style={{ height: 34, paddingLeft: 12, paddingRight: 12, borderRadius: 16, fontSize: 14, fontWeight: 500, color: '#fefeff', backgroundColor: '#9b9b9b' }}
            >
              Upgrade now
            </button>
          </div>
          <div className="border-l border-[#2c2c30] pl-4">
            <p className="text-[15px] font-medium text-white mb-1.5">Empty trash</p>
            <p className="text-[13px] text-[#a1a1aa] mb-3 font-normal leading-snug">Items in trash will be deleted permanently</p>
            <button
              type="button"
              onClick={handleEmptyTrash}
              disabled={trashLoading || files.length === 0}
              className="inline-flex items-center hover:bg-[#313131] active:scale-[0.97] transition-all duration-75 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ height: 34, paddingLeft: 12, paddingRight: 12, borderRadius: 16, fontSize: 14, fontWeight: 500, color: '#e5e5eb', backgroundColor: '#1f1f1f' }}
            >
              {trashLoading ? "Deleting…" : "Empty trash"}
            </button>
          </div>
        </div>
      )}

      <div style={{ borderRadius: 14, backgroundColor: '#171717' }}>
        <div
          className="flex items-center justify-between"
          style={{ minHeight: 38, paddingLeft: 12, paddingRight: 6, borderRadius: 14 }}
        >
          <div>
            <span className="text-[13px] text-[#888]">Delete account</span>
          </div>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleteAccountLoading}
            className="hover:bg-[#311] active:scale-[0.97] transition-all duration-75 disabled:opacity-40"
            style={{ height: 28, paddingLeft: 10, paddingRight: 10, borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#f87171', backgroundColor: 'rgba(248,113,113,0.08)', marginTop: 5, marginBottom: 5 }}
          >
            {deleteAccountLoading ? "Deleting…" : "Delete"}
          </button>
        </div>
        <p className="text-[11px] text-[#555] px-3 pb-2.5">
          All data will be permanently erased. This cannot be undone.
        </p>
      </div>
    </div>
    <EditProfileDialog open={editing} user={user} onClose={() => setEditing(false)} />
    </>
  )
}

function EditProfileDialog({
  open,
  user,
  onClose,
}: {
  open: boolean
  user: PreferencesUser
  onClose: () => void
}) {
  const { refreshUser } = useAuth()
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

  const handleSave = async () => {
    if (saving) return
    if (nickname.trim() === user.nickname) {
      onClose()
      return
    }
    setSaving(true)
    setError(null)
    try {
      const sessionKey = await getSessionKey()
      if (!sessionKey) throw new Error("E2E session key not found")
      
      const nickname_encrypted = await encryptE2E(nickname.trim(), sessionKey)

      const res = await fetch("/api/v2/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname_encrypted }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to update profile")
        return
      }
      await refreshUser()
      onClose()
    } catch (err) {
      setError("Network error. Please try again.")
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
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[420px] flex flex-col"
            style={{
              backgroundColor: '#1f1f1f',
              borderRadius: 20,
              boxShadow: '0 0 0 1px rgba(255,255,255,0.04)',
              padding: 3,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !saving) handleSave()
            }}
          >
            <div className="relative w-full flex flex-col" style={{ backgroundColor: '#111111', borderRadius: 17 }}>
              <div className="p-5 space-y-3">
                <div>
                  <p className="text-[12px] font-medium text-[#888] mb-1.5">Username</p>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    autoFocus
                    className="w-full focus:outline-none"
                    style={{ height: 36, paddingLeft: 12, paddingRight: 12, borderRadius: 10, backgroundColor: '#1f1f1f', border: '1px solid rgba(255,255,255,0.06)', fontSize: 13, fontWeight: 500, color: '#e3e3e3' }}
                  />
                </div>

                {error && (
                  <p className="text-[11px] text-red-400">{error}</p>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-1" style={{ marginTop: 4 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75 disabled:opacity-50"
                style={{ height: 34, borderRadius: 16, fontSize: 14, fontWeight: 400, color: '#e3e3e3' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !nickname.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ height: 34, borderRadius: 16, fontSize: 14, fontWeight: 500, color: '#ffffff' }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

type PlanInfo = {
  key: PreferencesTier
  label: string
  size: string
  monthly: string
  annual: string
  details: string[]
}

const PLAN_INFO: PlanInfo[] = [
  {
    key: "essential",
    label: "Essential",
    size: "300GB",
    monthly: "13.99 € / month",
    annual: "167.99 € / year",
    details: [
      "300 GB of storage",
      "550 MB max upload, 200 MB CDN",
      "30 CDN links · 25 file links",
      "2× expiration windows",
    ],
  },
  {
    key: "premium",
    label: "Premium",
    size: "750GB",
    monthly: "24.99 € / month",
    annual: "299.99 € / year",
    details: [
      "750 GB of storage",
      "1 GB max upload, 500 MB CDN",
      "100 CDN links · 75 file links",
      "3× expiration windows",
    ],
  },
  {
    key: "ultimate",
    label: "Ultimate",
    size: "1.1TB",
    monthly: "39.99 € / month",
    annual: "479.99 € / year",
    details: [
      "1.1 TB of storage",
      "2.5 GB max upload, 1 GB CDN",
      "500 CDN links · 500 file links",
      "4× expiration · priority support",
    ],
  },
  {
    key: "free",
    label: "Free",
    size: "1GB",
    monthly: "Free forever",
    annual: "Free forever",
    details: [
      "1 GB of storage",
      "100 MB max upload, 20 MB CDN",
      "10 CDN links · 10 file links",
      "Standard expiration",
    ],
  },
]

function PlansTab({ user, onSwitchTab }: { user: PreferencesUser; onSwitchTab?: (tab: PreferencesTab) => void }) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly")
  const currentTier = resolveTier(user)
  const [selectedTier, setSelectedTier] = useState<PreferencesTier>(currentTier)

  // If the user's actual tier changes (e.g., after upgrade), re-anchor selection
  useEffect(() => {
    setSelectedTier(currentTier)
  }, [currentTier])

  const selectedPlan = PLAN_INFO.find((p) => p.key === selectedTier) ?? PLAN_INFO[0]
  const isSelectedCurrent = selectedTier === currentTier

  return (
    <div>
      <div className="flex items-center justify-center mb-5">
        <div className="inline-flex rounded-[16px] bg-[#171717] p-1">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`px-4 py-1.5 rounded-[14px] text-[14px] transition-colors ${
              billing === "monthly" ? "bg-[#1f1f1f] text-white font-medium" : "text-[#a1a1aa] font-normal"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={`px-4 py-1.5 rounded-[14px] text-[14px] transition-colors ${
              billing === "annual" ? "bg-[#1f1f1f] text-white font-medium" : "text-[#a1a1aa] font-normal"
            }`}
          >
            Annual
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-3">
          {PLAN_INFO.map((p) => (
            <PlanCard
              key={p.key}
              tier={p.label}
              size={p.size}
              price={billing === "monthly" ? p.monthly : p.annual}
              current={p.key === currentTier}
              selected={p.key === selectedTier}
              onClick={() => setSelectedTier(p.key)}
            />
          ))}
        </div>

        <div style={{ borderRadius: 16, backgroundColor: '#171717', padding: 16 }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[22px] font-medium text-white tracking-tight">{selectedPlan.label}</p>
            {isSelectedCurrent && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#9b9b9b]/15 text-[#9b9b9b]">
                Current
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#a1a1aa] mb-4 font-normal">
            {selectedPlan.key === "free"
              ? "Free forever"
              : isSelectedCurrent
                ? "Thanks for supporting Hypastack."
                : `Billed ${billing === "annual" ? "annually" : "once"}.`}
          </p>
          <p className="text-[14px] font-medium text-white mb-2">Plan details</p>
          <ul className="space-y-1.5 text-[14px] text-[#e2e2e8] font-normal mb-5">
            {selectedPlan.details.map((d) => (
              <li key={d} className="flex items-start gap-2">
                <MIcon name="check" size={16} className="text-[#9b9b9b] shrink-0 mt-0.5" />
                <span>{d}</span>
              </li>
            ))}
          </ul>

          {!isSelectedCurrent && selectedPlan.key !== "free" && (
            <button
              onClick={() => onSwitchTab?.("billing")}
              className="block w-full text-center px-4 py-2.5 rounded-[16px] bg-[#9b9b9b] text-[#fefeff] text-[14px] font-medium hover:bg-[#7d7d7d] transition-colors cursor-pointer"
            >
              Switch to {selectedPlan.label}
            </button>
          )}
          {!isSelectedCurrent && selectedPlan.key === "free" && (
            <button
              onClick={() => onSwitchTab?.("billing")}
              className="block w-full text-center px-4 py-2.5 rounded-[16px] bg-[#3a3a3b] text-[#e5e5eb] text-[14px] font-medium hover:bg-[#444446] transition-colors cursor-pointer"
            >
              Downgrade to Free
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function PlanCard({
  tier,
  size,
  price,
  current,
  selected,
  onClick,
}: {
  tier: string
  size: string
  price: string
  current?: boolean
  selected?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-[17px] p-4 transition-colors ${
        selected
          ? "bg-[#1f1f1f] ring-2 ring-[#9b9b9b]"
          : "bg-[#171717] hover:bg-[#1a1a1a]"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#9b9b9b]/15 text-[#9b9b9b] text-[10px] font-semibold tracking-wide">
          {tier}
        </span>
        {current && (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#9b9b9b]/15 text-[#9b9b9b]">
            Current
          </span>
        )}
      </div>
      <p className="text-[22px] font-medium text-white tracking-tight">{size}</p>
      <p className="text-[13px] text-[#a1a1aa] mt-0.5 font-normal">{price}</p>
    </button>
  )
}

const XMR_PRICES: Record<PreferencesTier, string> = { free: "Free", essential: "0.03 XMR/mo", premium: "0.06 XMR/mo", ultimate: "0.12 XMR/mo" }
const XMR_AMOUNTS: Record<string, number> = { essential: 0.03, premium: 0.06, ultimate: 0.12 }

interface PaymentInvoice { paymentId: string; address: string; amount: number; tier: string; expiresAt: string }
interface PaymentStatus { status: string; confirmations: number; requiredConfirmations: number; txid?: string; tier: string; amount: number }
interface HistoryItem { id: string; tier: string; amount: number; status: string; txid: string | null; createdAt: string; receiptBase64?: string }

function truncateTxid(t: string) { return t.length <= 18 ? t : t.slice(0, 8) + "…" + t.slice(-6) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) }

function BillingTab({ user }: { user: PreferencesUser }) {
  const { refreshUser } = useAuth()
  const currentTier = resolveTier(user)
  const [invoice, setInvoice] = useState<PaymentInvoice | null>(null)
  const [pStatus, setPStatus] = useState<PaymentStatus | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [creating, setCreating] = useState<string | null>(null)
  const [copied, setCopied] = useState<"addr" | "amt" | null>(null)
  const [error, setError] = useState("")
  const poller = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => { fetchHist() }, [])
  useEffect(() => {
    if (!invoice) return
    poll()
    poller.current = setInterval(poll, 15_000)
    return () => { if (poller.current) clearInterval(poller.current) }
  }, [invoice?.paymentId])

  const fetchHist = async () => { try { const r = await fetch("/api/v2/payments/history"); if (r.ok) { const d = await r.json(); setHistory(d.payments || []) } } catch {} }
  const poll = useCallback(async () => {
    if (!invoice) return
    try {
      const r = await fetch(`/api/v2/payments/status?id=${invoice.paymentId}`)
      if (!r.ok) return
      const d: PaymentStatus = await r.json()
      setPStatus(d)
      if (d.status === "confirmed") { if (poller.current) clearInterval(poller.current); refreshUser(); fetchHist() }
      if (d.status === "expired" || d.status === "cancelled" || d.status === "underpaid") { if (poller.current) clearInterval(poller.current); fetchHist() }
    } catch {}
  }, [invoice])

  const pay = async (tier: PreferencesTier) => {
    setError(""); setCreating(tier)
    try {
      const r = await fetch("/api/v2/payments/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "Failed")
      setInvoice(d); setPStatus(null)
    } catch (e: any) { setError(e.message) } finally { setCreating(null) }
  }

  const copy = async (t: string, k: "addr" | "amt") => { await navigator.clipboard.writeText(t); setCopied(k); setTimeout(() => setCopied(null), 2000) }
  const closeInv = () => { if (poller.current) clearInterval(poller.current); setInvoice(null); setPStatus(null) }

  const TIERS: PreferencesTier[] = ["essential", "premium", "ultimate"]

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <div className="flex items-center justify-between" style={{ backgroundColor: '#171717', borderRadius: 16, padding: '14px 16px' }}>
        <div>
          <p className="text-[22px] font-medium text-white tracking-tight">{TIER_LABELS[currentTier]}</p>
          <p className="text-[13px] text-[#a1a1aa] font-normal mt-0.5">{currentTier === "free" ? "Upgrade for higher limits." : "Thanks for supporting Hypastack."}</p>
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${currentTier !== "free" ? "bg-[#9b9b9b]/15 text-[#9b9b9b]" : "bg-[#1f1f1f] text-[#7a7a80]"}`}>
          {currentTier !== "free" ? "Active" : "Free"}
        </span>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TIERS.map(t => {
          const isCurrent = t === currentTier
          return (
            <div key={t} style={{ backgroundColor: isCurrent ? 'rgba(155,155,155,0.05)' : '#171717', borderRadius: 16, padding: 16 }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[15px] font-semibold text-white">{TIER_LABELS[t]}</span>
                {isCurrent && <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#9b9b9b]/15 text-[#9b9b9b]">Current</span>}
              </div>
              <p className="text-[13px] text-[#7a7a80] font-normal mb-3">{XMR_PRICES[t]}</p>
              {!isCurrent && (
                <button onClick={() => pay(t)} disabled={creating === t}
                  className="w-full rounded-[16px] bg-[#1f1f1f] text-[13px] font-medium text-[#e5e5eb] py-2 hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {creating === t ? <><MIcon name="progress_activity" size={16} className="animate-spin" /> Creating…</> : <>Pay with XMR <MIcon name="open_in_new" size={16} /></>}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {error && <p className="text-[13px] text-red-400">{error}</p>}

      {/* Payment modal overlay inside the tab */}
      <AnimatePresence>
        {invoice && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget && pStatus?.status !== "confirming") closeInv() }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md rounded-[20px] bg-[#1f1f1f] shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h3 className="text-[16px] font-semibold text-white">
                  {pStatus?.status === "confirmed" ? "Payment confirmed!" : pStatus?.status === "expired" ? "Invoice expired" : pStatus?.status === "underpaid" ? "Underpaid" : `Upgrade to ${TIER_LABELS[(invoice.tier as PreferencesTier) || "essential"]}`}
                </h3>
                <button onClick={closeInv} className="p-1.5 rounded-[16px] text-[#7a7a80] hover:text-white hover:bg-[#1f1f1f] transition-colors"><MIcon name="close" size={18} /></button>
              </div>
              <div className="px-5 pb-5 space-y-3">
                {pStatus?.status === "confirmed" ? (
                  <div className="p-5 text-center">
                    <MIcon name="check_circle" size={42} className="text-emerald-500 mx-auto mb-2" />
                    <p className="text-[14px] font-semibold text-emerald-400">Payment received</p>
                    <p className="text-[12px] text-emerald-500/80 mt-1">{pStatus.confirmations} confirmations · {truncateTxid(pStatus.txid || "")}</p>
                  </div>
                ) : pStatus?.status === "expired" ? (
                  <div className="p-5 text-center">
                    <MIcon name="error" size={42} className="text-red-500 mx-auto mb-2" />
                    <p className="text-[14px] font-semibold text-red-400">Invoice expired</p>
                  </div>
                ) : pStatus?.status === "underpaid" ? (
                  <div className="p-5 text-center">
                    <MIcon name="error" size={42} className="text-amber-500 mx-auto mb-2" />
                    <p className="text-[14px] font-semibold text-amber-400">Payment underpaid</p>
                    <p className="text-[12px] text-amber-500/80 mt-1">You did not send the full amount. Please contact support.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ borderRadius: 16, backgroundColor: '#171717', padding: '12px 14px' }}>
                      <div className="flex items-center justify-between mb-1"><span className="text-[11px] text-[#7a7a80] uppercase tracking-wider font-medium">Amount</span><button onClick={() => copy(String(invoice.amount), "amt")} className="text-[#7a7a80] hover:text-white p-0.5">{copied === "amt" ? <MIcon name="check_circle" size={16} className="text-emerald-500" /> : <MIcon name="content_copy" size={16} />}</button></div>
                      <p className="text-[20px] font-bold text-white font-mono">{invoice.amount} <span className="text-[#7a7a80] text-[14px]">XMR</span></p>
                    </div>
                    <div style={{ borderRadius: 16, backgroundColor: '#171717', padding: '12px 14px' }}>
                      <div className="flex items-center justify-between mb-1"><span className="text-[11px] text-[#7a7a80] uppercase tracking-wider font-medium">Send to</span><button onClick={() => copy(invoice.address, "addr")} className="text-[#7a7a80] hover:text-white p-0.5">{copied === "addr" ? <MIcon name="check_circle" size={16} className="text-emerald-500" /> : <MIcon name="content_copy" size={16} />}</button></div>
                      <p className="text-[12px] font-mono text-white break-all leading-relaxed select-all">{invoice.address}</p>
                    </div>
                    <div style={{ borderRadius: 16, backgroundColor: '#171717', padding: '12px 14px' }}>
                      {pStatus?.status === "confirming" ? (
                        <div className="flex items-center gap-2.5"><MIcon name="progress_activity" size={18} className="text-amber-400 animate-spin" /><div><p className="text-[13px] font-medium text-amber-400">Payment detected — confirming</p><p className="text-[12px] text-[#7a7a80]">{pStatus.confirmations}/{pStatus.requiredConfirmations} confirmations</p></div></div>
                      ) : (
                        <div className="flex items-center gap-2.5"><div className="relative flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9b9b9b] opacity-75" /><span className="relative inline-flex rounded-full h-4 w-4 bg-[#9b9b9b] items-center justify-center"><MIcon name="schedule" size={12} className="text-white" /></span></div><div><p className="text-[13px] font-medium text-white">Waiting for payment…</p><p className="text-[12px] text-[#7a7a80]">Polling every 15s · Expires {new Date(invoice.expiresAt).toLocaleTimeString()}</p></div></div>
                      )}
                      {pStatus?.status === "confirming" && <div className="mt-2.5 h-1 w-full rounded-full bg-[#2c2c30] overflow-hidden"><motion.div className="h-full rounded-full bg-amber-400" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (pStatus.confirmations / pStatus.requiredConfirmations) * 100)}%` }} /></div>}
                    </div>
                  </>
                )}
                {(pStatus?.status === "confirmed" || pStatus?.status === "expired" || pStatus?.status === "underpaid") && <button onClick={closeInv} className={`w-full rounded-[16px] px-4 py-2.5 text-[14px] font-semibold ${pStatus.status === "confirmed" ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-[#1f1f1f] text-[#e5e5eb] hover:bg-[#313131]"} transition-colors`}>{pStatus.status === "confirmed" ? "Done" : "Close"}</button>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment history */}
      <div>
        <p className="text-[12px] font-medium text-[#555] mb-2 px-1">Payment history</p>
        <div style={{ borderRadius: 16, backgroundColor: '#171717', overflow: 'hidden' }}>
          {history.length > 0 ? history.map(p => (
            <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 gap-3 sm:gap-0 border-b border-[rgba(255,255,255,0.05)] last:border-0 text-[13px]">
              <div className="flex items-center gap-3">
                <span className="text-[#555]">{fmtDate(p.createdAt)}</span>
                <span className="font-medium text-[#e3e3e3]">{TIER_LABELS[(p.tier as PreferencesTier) || "free"]}</span>
                <span className="font-mono text-[#555]">{p.amount} XMR</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${pStatus?.status === "confirmed" || p.status === "confirmed" ? "bg-emerald-500/10 text-emerald-400" : p.status === "pending" || p.status === "confirming" ? "bg-amber-500/10 text-amber-400" : p.status === "underpaid" ? "bg-orange-500/10 text-orange-400" : "bg-red-500/10 text-red-400"}`}>{p.status}</span>
                {p.receiptBase64 && (
                  <a
                    href={`data:application/pdf;base64,${p.receiptBase64}`}
                    download={`Hypastack_Receipt_${p.id}.pdf`}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-[#555] hover:text-white transition-colors bg-[#1f1f1f] hover:bg-[#1a1a1a] px-2 py-0.5 rounded-[8px]"
                  >
                    <MIcon name="download" size={14} /> PDF
                  </a>
                )}
              </div>
            </div>
          )) : (
            <div className="px-4 py-8 text-center"><p className="text-[13px] text-[#555]">No payments yet. Your history will appear here.</p></div>
          )}
        </div>
      </div>
    </div>
  )
}

function IntegrationsTab() {
  return (
    <div className="space-y-4">
      <div style={{ borderRadius: 16, backgroundColor: '#171717', padding: '14px 16px' }}>
        <p className="text-[13px] text-[#e3e3e3] font-medium mb-1">Coming soon</p>
        <p className="text-[13px] text-[#555] leading-relaxed">
          Discord bots, integrations, and third-party connectors are on the way.
        </p>
      </div>
    </div>
  )
}

function SecurityTab({ user }: { user: PreferencesUser }) {
  const tier = resolveTier(user)
  const isPaid = tier !== "free"

  const [purgeDays, setPurgeDays] = useState(7)
  const [purgeInput, setPurgeInput] = useState("7")
  const [purgeSaving, setPurgeSaving] = useState(false)
  const [purgeSaved, setPurgeSaved] = useState(false)
  const [purgeError, setPurgeError] = useState<string | null>(null)

  // Use the inactivityPurgeDays from the user prop (already fetched by useAuth)
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
      const res = await fetch("/api/v2/auth/inactivity-purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: val }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      setPurgeDays(val)
      setPurgeSaved(true)
      setTimeout(() => setPurgeSaved(false), 2000)
    } catch (err: any) {
      setPurgeError(err.message)
    } finally {
      setPurgeSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Zero-knowledge info */}
      <div style={{ borderRadius: 16, backgroundColor: '#171717', padding: '14px 16px' }}>
        <p className="text-[13px] text-[#a1a1aa] leading-relaxed">
          Hypastack stores <span className="text-white font-medium">encrypted usernames</span>,{" "}
          <span className="text-white font-medium">hashed access keys</span>,{" "}
          <span className="text-white font-medium">encrypted filenames</span>, and{" "}
          <span className="text-white font-medium">metadata-stripped assets</span>.{" "}
          No emails, no IPs, no passwords, no plaintext PII — ever.
        </p>
      </div>

      {/* Inactivity purge */}
      <div style={{ borderRadius: 16, backgroundColor: '#171717' }}>
        <div
          className="flex items-center justify-between"
          style={{ height: 38, paddingLeft: 12, paddingRight: 6, borderRadius: 10 }}
        >
          <span className="text-[13px] text-[#888]">Inactivity purge</span>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="number"
                min={7}
                max={365}
                value={purgeInput}
                onChange={(e) => {
                  setPurgeInput(e.target.value)
                  setPurgeError(null)
                  setPurgeSaved(false)
                }}
                disabled={!isPaid}
                className={`w-[70px] text-center focus:outline-none ${!isPaid ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ height: 28, borderRadius: 8, backgroundColor: '#1f1f1f', border: '1px solid rgba(255,255,255,0.06)', fontSize: 13, fontWeight: 500, color: '#e3e3e3' }}
                placeholder="7"
              />
            </div>
            <span className="text-[12px] text-[#555]">days</span>
            <button
              onClick={handlePurgeSave}
              disabled={!isPaid || purgeSaving || purgeInput === String(purgeDays)}
              className="hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ height: 28, paddingLeft: 10, paddingRight: 10, borderRadius: 8, fontSize: 13, fontWeight: 500, color: purgeSaved ? '#4ade80' : '#e3e3e3', backgroundColor: purgeSaved ? 'rgba(74,222,128,0.1)' : '#1f1f1f' }}
            >
              {purgeSaved ? "Saved" : purgeSaving ? "…" : "Save"}
            </button>
          </div>
        </div>
        {purgeError && (
          <p className="text-[11px] text-red-400 px-3 pb-2">{purgeError}</p>
        )}
      </div>

      {!isPaid && (
        <p className="text-[11px] text-[#555] px-1">
          Fixed at <span className="text-[#888] font-medium">7 days</span> for free accounts. Upgrade to customize.
        </p>
      )}
    </div>
  )
}

function SecurityRow({
  icon,
  title,
  description,
  href,
}: {
  icon: string
  title: string
  description: string
  href: string
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-4 px-4 py-3.5 hover:bg-[#1f1f23] transition-colors"
    >
      <div className="h-10 w-10 rounded-[10px] bg-[#9b9b9b]/15 flex items-center justify-center text-[#9b9b9b] shrink-0">
        <MIcon name={icon} size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-white">{title}</p>
        <p className="text-[13px] text-[#a1a1aa] truncate font-normal">{description}</p>
      </div>
      <MIcon name="chevron_right" size={20} className="text-[#a1a1aa] shrink-0" />
    </a>
  )
}
