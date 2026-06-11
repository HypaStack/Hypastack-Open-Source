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
  free: "5 GB",
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
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-md"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 sm:p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative w-full h-full sm:w-full sm:max-w-[1060px] sm:h-[720px] sm:max-h-[92vh] flex flex-col pointer-events-auto bg-[#ebebeb] dark:bg-[#333]"
              style={{
                borderRadius: 20,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 24px 48px rgba(0,0,0,0.12)',
                padding: 3,
              }}
            >
              <div className="flex flex-col sm:flex-row w-full h-full gap-[3px] overflow-hidden">
              <div className="sm:hidden shrink-0 bg-[#f5f5f5] dark:bg-[#222] pt-3 pb-1 rounded-[17px] flex flex-col">
                <div className="flex items-center justify-between px-4 pb-3 pt-1">
                  <span className="text-[17px] font-semibold text-[#111] dark:text-[#f0f0f0]">Settings</span>
                  <button
                    onClick={onClose}
                    className="flex items-center justify-center w-8 h-8 bg-[#ebebeb] dark:bg-[#333] active:bg-[#e5e5e5] dark:active:bg-[#444] rounded-full text-[#555] dark:text-[#ccc] transition-colors"
                  >
                    <MIcon name="close" size={18} />
                  </button>
                </div>
                <div className="flex gap-1 px-3 pb-2 overflow-x-auto no-scrollbar">
                  <TabButton active={active === "general"} onClick={() => setActive("general")} label="General" layoutIdPrefix="mobile" />
                  <TabButton active={active === "account"} onClick={() => setActive("account")} label="Account" layoutIdPrefix="mobile" />
                  <TabButton active={active === "plans"} onClick={() => setActive("plans")} label="Plans" layoutIdPrefix="mobile" />
                  <TabButton active={active === "billing"} onClick={() => setActive("billing")} label="Billing" layoutIdPrefix="mobile" />
                  <TabButton active={active === "integrations"} onClick={() => setActive("integrations")} label="Integrations" layoutIdPrefix="mobile" />
                  <TabButton active={active === "security"} onClick={() => setActive("security")} label="Security" layoutIdPrefix="mobile" />
                </div>
              </div>

              <div className="hidden sm:flex w-[210px] shrink-0 bg-[#f5f5f5] dark:bg-[#222] rounded-[17px] px-3 pt-6 pb-4 flex-col">
                <div className="space-y-0.5">
                  <TabButton active={active === "general"} onClick={() => setActive("general")} label="General" layoutIdPrefix="desktop" />
                  <TabButton active={active === "account"} onClick={() => setActive("account")} label="Account" layoutIdPrefix="desktop" />
                  <TabButton active={active === "plans"} onClick={() => setActive("plans")} label="Plans" layoutIdPrefix="desktop" />
                  <TabButton active={active === "billing"} onClick={() => setActive("billing")} label="Billing" layoutIdPrefix="desktop" />
                  <TabButton active={active === "integrations"} onClick={() => setActive("integrations")} label="Integrations" layoutIdPrefix="desktop" />
                  <TabButton active={active === "security"} onClick={() => setActive("security")} label="Security" layoutIdPrefix="desktop" />
                </div>
              </div>

              <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-[#ffffff] dark:bg-[#1c1c1c] rounded-[17px] overflow-hidden">
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
          ? "text-[#111111] dark:text-[#f0f0f0] font-medium"
          : "text-[#888] dark:text-[#777] hover:bg-[#ebebeb] dark:hover:bg-[#2a2a2a] hover:text-[#333] dark:hover:text-[#ccc] active:scale-[0.97] font-medium"
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
          className="absolute inset-0 bg-white dark:bg-[#1c1c1c] rounded-[16px]"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
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
      <h4 className="text-[16px] font-medium text-[#111] dark:text-[#f0f0f0] mb-3">{title}</h4>
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
      <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-transparent" style={{ borderRadius: 16, padding: '14px 16px' }}>
        <p className="text-[12px] font-medium text-[#888] dark:text-[#777] mb-3">Appearance</p>
        <div className="grid grid-cols-3 gap-3 max-w-[520px]">
          <ThemeTile variant="system" label="System" active={theme === "system"} onClick={() => setTheme("system")} />
          <ThemeTile variant="light" label="Light" active={theme === "light"} onClick={() => setTheme("light")} />
          <ThemeTile variant="dark" label="Dark" active={theme === "dark"} onClick={() => setTheme("dark")} />
        </div>
      </div>

      <div
        className="flex items-center justify-between cursor-pointer hover:bg-[#f0f0f0] dark:hover:bg-[#2a2a2a] transition-all duration-75 bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-transparent"
        style={{ height: 38, paddingLeft: 12, paddingRight: 10, borderRadius: 14 }}
        onClick={() => setLangOpen((o) => !o)}
      >
        <span className="text-[13px] text-[#888] dark:text-[#777]">Language</span>
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#111] dark:text-[#f0f0f0]">
          {language.label} <span className="text-[#999] dark:text-[#666]">({language.native})</span>
          <MIcon
            name="expand_more"
            size={15}
            className={`text-[#aaa] transition-transform ${langOpen ? "rotate-180" : ""}`}
          />
        </span>
      </div>
      {langOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setLangOpen(false)} />
          <div
            className="relative z-[110] -mt-2 w-full max-h-[280px] overflow-y-auto bg-[#ffffff] dark:bg-[#1c1c1c] border border-[#e5e5e5] dark:border-transparent"
            style={{ padding: 4, borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
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
                      ? "text-[#111] dark:text-[#f0f0f0] font-medium bg-[#f0f0f0] dark:bg-[#2a2a2a]"
                      : "text-[#333] dark:text-[#ccc] hover:bg-[#f5f5f5] dark:hover:bg-[#222] active:scale-[0.97]"
                  }`}
                  style={{ height: 34, paddingLeft: 12, paddingRight: 12, borderRadius: 10, fontSize: 13, border: 'none', cursor: 'pointer' }}
                >
                  <span>
                    {l.label} <span className="text-[#aaa]">({l.native})</span>
                  </span>
                  {selected && <MIcon name="check" size={15} className="text-[#555]" />}
                </button>
              )
            })}
          </div>
        </>
      )}

      <a
        href="/help"
        className="flex items-center justify-between hover:bg-[#f0f0f0] dark:hover:bg-[#2a2a2a] transition-all duration-75 bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-transparent"
        style={{ height: 38, paddingLeft: 12, paddingRight: 12, borderRadius: 14 }}
      >
        <span className="text-[13px] text-[#888] dark:text-[#777]">Support</span>
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#333] dark:text-[#ccc]">Open Support Centre <MIcon name="open_in_new" size={14} /></span>
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
            ? "ring-2 ring-[#111] dark:ring-[#e3e3e3] ring-offset-0"
            : "ring-1 ring-[#e5e5e5] dark:ring-transparent hover:ring-[#ccc] dark:hover:ring-[#555]"
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
      <span className={`text-[13px] ${active ? "font-medium text-[#111] dark:text-[#f0f0f0]" : "font-normal text-[#888] dark:text-[#777]"}`}>
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

      onClose()

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
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-md" 
        onClick={onClose} 
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[420px] flex flex-col bg-[#ebebeb] dark:bg-[#333]"
        style={{
          borderRadius: 20,
          boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 16px 32px rgba(0,0,0,0.12)',
          padding: 3,
        }}
      >
        <div className="relative w-full flex flex-col bg-[#ffffff] dark:bg-[#1c1c1c]" style={{ borderRadius: 17 }}>
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

        <div className="flex gap-1" style={{ marginTop: 4 }}>
          <button 
            onClick={onClose} 
            className="flex-1 flex items-center justify-center gap-1.5 hover:bg-[#f5f5f5] dark:hover:bg-[#222] active:scale-[0.97] transition-all duration-75"
            style={{ height: 34, borderRadius: 16, fontSize: 14, fontWeight: 400, color: '#666' }}
          >
            Cancel
          </button>
          <button 
            onClick={handleUpload} 
            className="flex-1 flex items-center justify-center gap-1.5 hover:bg-[#f5f5f5] dark:hover:bg-[#222] active:scale-[0.97] transition-all duration-75"
            style={{ height: 34, borderRadius: 16, fontSize: 14, fontWeight: 500, color: '#111' }}
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
    user.avatarUrl ? `https://r2.hypastack.com/${user.avatarUrl}` : null
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
    setAvatarSrc(`https://r2.hypastack.com/${user.avatarUrl}?t=${Date.now()}`)
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

      <div className="flex items-center gap-5 mb-4 bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-transparent" style={{ borderRadius: 16, padding: '16px 20px' }}>
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
              <div className="h-full w-full flex items-center justify-center bg-[#333] text-white text-[24px] font-semibold rounded-full">
                {initials}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            )}
          </div>
          <label
            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white dark:bg-[#1c1c1c] border border-[#e5e5e5] dark:border-transparent flex items-center justify-center text-[#555] hover:text-[#111] hover:bg-[#f0f0f0] dark:hover:bg-[#2a2a2a] hover:scale-105 active:scale-95 transition-all duration-200 z-10 cursor-pointer shadow-sm"
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
            <p className="text-[17px] font-medium text-[#111] dark:text-[#f0f0f0] truncate max-w-[calc(100%-20px)]">{user.nickname}</p>
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
            className="flex items-center gap-1.5 hover:text-[#111] dark:hover:text-[#f0f0f0] transition-colors active:scale-[0.97] mb-2 mt-0.5"
            style={{ fontSize: 12, fontWeight: 500, color: copiedId ? '#16a34a' : '#aaa' }}
          >
            <MIcon name={copiedId ? "check" : "content_copy"} size={13} /> 
            {copiedId ? "Copied!" : "Copy user ID"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 hover:bg-[#ebebeb] dark:hover:bg-[#222] active:scale-[0.97] transition-all duration-75 text-[#333] dark:text-[#ccc] bg-[#ffffff] dark:bg-[#1c1c1c] border border-[#e5e5e5] dark:border-transparent"
            style={{ height: 26, paddingLeft: 8, paddingRight: 8, borderRadius: 8, fontSize: 12, fontWeight: 500 }}
          >
            <MIcon name="edit" size={13} />
            Edit
          </button>
        </div>
      </div>

      <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-transparent" style={{ borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <p className="text-[28px] font-medium text-[#111] dark:text-[#f0f0f0] tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
              {storage ? formatBytes(storage.totalStorage) : "-"}
            </p>
            <p className="text-[12px] text-[#888] dark:text-[#777] font-normal">Space used ({Math.round(usedPct)}%)</p>
          </div>
          <div className="border-t sm:border-t-0 sm:border-l border-[#e5e5e5] dark:border-transparent pt-4 sm:pt-0 sm:pl-6">
            <p className="text-[28px] font-medium text-[#111] dark:text-[#f0f0f0] tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
              {storage ? formatBytes(storage.maxStorage) : "-"}
            </p>
            <p className="text-[12px] text-[#888] dark:text-[#777] font-normal">Total space</p>
          </div>
        </div>
        <div className="mt-4 h-1.5 w-full rounded-full bg-[#e5e5e5] dark:bg-[#333] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#111] transition-all duration-500"
            style={{ width: `${Math.min(100, usedPct)}%` }}
          />
        </div>
        <div className="mt-2.5 flex items-center gap-4 text-[12px] text-[#888] dark:text-[#777] font-normal">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#111]" /> Drive
          </span>
        </div>
      </div>

      {!user.premium && (
        <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-transparent" style={{ borderRadius: 16, padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginBottom: 16 }}>
          <div>
            <p className="text-[15px] font-medium text-[#111] dark:text-[#f0f0f0] mb-1.5">Upgrade</p>
            <p className="text-[13px] text-[#888] dark:text-[#777] mb-3 font-normal leading-snug">Level up your storage space and get many other benefits</p>
            <button
              onClick={() => onSwitchTab?.("plans")}
              className="inline-flex items-center hover:bg-[#333] dark:hover:bg-[#e3e3e3] active:scale-[0.97] transition-all duration-75 text-[#fff] dark:text-[#111] bg-[#111] dark:bg-[#fff]"
              style={{ height: 34, paddingLeft: 12, paddingRight: 12, borderRadius: 16, fontSize: 14, fontWeight: 500 }}
            >
              Upgrade now
            </button>
          </div>
          <div className="border-l border-[#e5e5e5] dark:border-transparent pl-4">
            <p className="text-[15px] font-medium text-[#111] dark:text-[#f0f0f0] mb-1.5">Empty trash</p>
            <p className="text-[13px] text-[#888] dark:text-[#777] mb-3 font-normal leading-snug">Items in trash will be deleted permanently</p>
            <button
              type="button"
              onClick={handleEmptyTrash}
              disabled={trashLoading || files.length === 0}
              className="inline-flex items-center hover:bg-[#ebebeb] dark:hover:bg-[#222] active:scale-[0.97] transition-all duration-75 disabled:opacity-40 disabled:cursor-not-allowed text-[#333] dark:text-[#ccc] bg-[#ffffff] dark:bg-[#1c1c1c] border border-[#e5e5e5] dark:border-transparent"
              style={{ height: 34, paddingLeft: 12, paddingRight: 12, borderRadius: 16, fontSize: 14, fontWeight: 500 }}
            >
              {trashLoading ? "Deleting..." : "Empty trash"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-transparent" style={{ borderRadius: 14 }}>
        <div
          className="flex items-center justify-between"
          style={{ minHeight: 38, paddingLeft: 12, paddingRight: 6, borderRadius: 14 }}
        >
          <div>
            <span className="text-[13px] text-[#888] dark:text-[#777]">Delete account</span>
          </div>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleteAccountLoading}
            className="hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-[0.97] transition-all duration-75 disabled:opacity-40 text-[#ef4444] bg-[rgba(239,68,68,0.08)]"
            style={{ height: 28, paddingLeft: 10, paddingRight: 10, borderRadius: 8, fontSize: 13, fontWeight: 500, marginTop: 5, marginBottom: 5 }}
          >
            {deleteAccountLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
        <p className="text-[11px] text-[#aaa] px-3 pb-2.5">
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
      if (!sessionKey) {
        setError("Session key not found. Please log out and log back in, then try again.")
        return
      }
      
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
    } catch (err: any) {
      setError(err?.message || "Network error. Please try again.")
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
            className="relative w-full max-w-[420px] flex flex-col bg-[#ebebeb] dark:bg-[#333]"
            style={{
              borderRadius: 20,
              boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 16px 32px rgba(0,0,0,0.10)',
              padding: 3,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !saving) handleSave()
            }}
          >
            <div className="relative w-full flex flex-col bg-[#ffffff] dark:bg-[#1c1c1c]" style={{ borderRadius: 17 }}>
              <div className="p-5 space-y-3">
                <div>
                  <p className="text-[12px] font-medium text-[#888] dark:text-[#777] mb-1.5">Username</p>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    autoFocus
                    className="w-full focus:outline-none bg-[#f5f5f5] dark:bg-[#111] border border-[#e5e5e5] dark:border-transparent text-[#111] dark:text-[#f0f0f0]"
                    style={{ height: 36, paddingLeft: 12, paddingRight: 12, borderRadius: 10, fontSize: 13, fontWeight: 500 }}
                  />
                </div>

                {error && (
                  <p className="text-[11px] text-red-500">{error}</p>
                )}
              </div>
            </div>

            <div className="flex gap-1" style={{ marginTop: 4 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 hover:bg-[#e0e0e0] dark:hover:bg-[#444] active:scale-[0.97] transition-all duration-75 disabled:opacity-50 text-[#666] dark:text-[#888]"
                style={{ height: 34, borderRadius: 16, fontSize: 14, fontWeight: 400 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !nickname.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 hover:bg-[#e0e0e0] dark:hover:bg-[#444] active:scale-[0.97] transition-all duration-75 disabled:opacity-40 disabled:cursor-not-allowed text-[#111] dark:text-[#f0f0f0]"
                style={{ height: 34, borderRadius: 16, fontSize: 14, fontWeight: 500 }}
              >
                {saving ? "Saving..." : "Save"}
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
      "30 CDN links - 25 file links",
      "2x expiration windows",
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
      "100 CDN links - 75 file links",
      "3x expiration windows",
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
      "500 CDN links - 500 file links",
      "4x expiration - priority support",
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
      "10 CDN links - 10 file links",
      "Standard expiration",
    ],
  },
]

function PlansTab({ user, onSwitchTab }: { user: PreferencesUser; onSwitchTab?: (tab: PreferencesTab) => void }) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly")
  const currentTier = resolveTier(user)
  const [selectedTier, setSelectedTier] = useState<PreferencesTier>(currentTier)

  useEffect(() => {
    setSelectedTier(currentTier)
  }, [currentTier])

  const selectedPlan = PLAN_INFO.find((p) => p.key === selectedTier) ?? PLAN_INFO[0]
  const isSelectedCurrent = selectedTier === currentTier

  return (
    <div>
      <div className="flex items-center justify-center mb-5">
        <div className="inline-flex rounded-[16px] p-1 bg-[#f0f0f0] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-transparent">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`px-4 py-1.5 rounded-[14px] text-[14px] transition-colors ${
              billing === "monthly" ? "bg-white dark:bg-[#1c1c1c] text-[#111] dark:text-[#f0f0f0] font-medium shadow-sm" : "text-[#888] dark:text-[#777] font-normal"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={`px-4 py-1.5 rounded-[14px] text-[14px] transition-colors ${
              billing === "annual" ? "bg-white dark:bg-[#1c1c1c] text-[#111] dark:text-[#f0f0f0] font-medium shadow-sm" : "text-[#888] dark:text-[#777] font-normal"
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

        <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-transparent" style={{ borderRadius: 16, padding: 16 }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[22px] font-medium text-[#111] dark:text-[#f0f0f0] tracking-tight">{selectedPlan.label}</p>
            {isSelectedCurrent && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#111]/10 text-[#333] dark:text-[#ccc]">
                Current
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#888] dark:text-[#777] mb-4 font-normal">
            {selectedPlan.key === "free"
              ? "Free forever"
              : isSelectedCurrent
                ? "Thanks for supporting Hypastack."
                : `Billed ${billing === "annual" ? "annually" : "once"}.`}
          </p>
          <p className="text-[14px] font-medium text-[#111] dark:text-[#f0f0f0] mb-2">Plan details</p>
          <ul className="space-y-1.5 text-[14px] text-[#444] font-normal mb-5">
            {selectedPlan.details.map((d) => (
              <li key={d} className="flex items-start gap-2">
                <MIcon name="check" size={16} className="text-[#555] shrink-0 mt-0.5" />
                <span>{d}</span>
              </li>
            ))}
          </ul>

          {!isSelectedCurrent && selectedPlan.key !== "free" && (
            <button
              onClick={() => onSwitchTab?.("billing")}
              className="block w-full text-center px-4 py-2.5 rounded-[16px] bg-[#111] text-white dark:text-white text-[14px] font-medium hover:bg-[#333] transition-colors cursor-pointer"
            >
              Switch to {selectedPlan.label}
            </button>
          )}
          {!isSelectedCurrent && selectedPlan.key === "free" && (
            <button
              onClick={() => onSwitchTab?.("billing")}
              className="block w-full text-center px-4 py-2.5 rounded-[16px] text-[14px] font-medium transition-colors cursor-pointer bg-[#ebebeb] dark:bg-[#222] text-[#555] dark:text-[#888] border border-[#e5e5e5] dark:border-transparent"
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
      className={`w-full text-left rounded-[17px] p-4 transition-all ${
        selected
          ? "bg-white dark:bg-[#1c1c1c] ring-2 ring-[#111] dark:ring-[#e3e3e3]"
          : "bg-[#f5f5f5] dark:bg-[#222] hover:bg-[#f0f0f0] dark:hover:bg-[#2a2a2a] border border-[#ebebeb] dark:border-transparent"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#111]/8 text-[#333] dark:text-[#ccc] text-[10px] font-semibold tracking-wide">
          {tier}
        </span>
        {current && (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#111]/8 text-[#555]">
            Current
          </span>
        )}
      </div>
      <p className="text-[22px] font-medium text-[#111] dark:text-[#f0f0f0] tracking-tight">{size}</p>
      <p className="text-[13px] text-[#888] dark:text-[#777] mt-0.5 font-normal">{price}</p>
    </button>
  )
}

function BillingTab({ user }: { user: PreferencesUser }) {
  const currentTier = resolveTier(user)

  const [creditsBalance, setCreditsBalance] = useState(0)
  const [creditsBalanceEur, setCreditsBalanceEur] = useState(0)
  const [freeUnitsRemaining, setFreeUnitsRemaining] = useState(5000)
  const [mUsage, setMUsage] = useState({ opUnitsUsed: 0, freeUnitsUsed: 0, creditUnitsUsed: 0 })
  const [creditsLoading, setCreditsLoading] = useState(true)
  const [purchaseLoading, setPurchaseLoading] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [creditsError, setCreditsError] = useState("")
  const FREE_UNITS_TOTAL = 5000

  useEffect(() => { fetchCredits() }, [])

  const fetchCredits = async () => {
    try {
      const r = await fetch("/api/v2/credits/balance")
      if (r.ok) {
        const d = await r.json()
        setCreditsBalance(d.balance ?? 0)
        setCreditsBalanceEur(d.balanceEur ?? 0)
        setFreeUnitsRemaining(d.freeUnitsRemaining ?? 0)
        if (d.monthlyUsage) setMUsage(d.monthlyUsage)
      }
    } catch {} finally { setCreditsLoading(false) }
  }

  const purchaseCredits = async (amountEur: number) => {
    setCreditsError(""); setPurchaseLoading(amountEur)
    try {
      const r = await fetch("/api/v2/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountEur }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "Failed to create checkout")
      if (d.checkoutUrl) window.location.href = d.checkoutUrl
    } catch (e: any) { setCreditsError(e.message) } finally { setPurchaseLoading(null) }
  }

  const handleCustomPurchase = () => {
    const amt = parseInt(customAmount, 10)
    if (isNaN(amt) || amt < 10) { setCreditsError("Minimum custom amount is €10"); return }
    purchaseCredits(amt)
  }

  const freeUsedPct = creditsLoading ? 0 : Math.min(100, Math.round(((FREE_UNITS_TOTAL - freeUnitsRemaining) / FREE_UNITS_TOTAL) * 100))

  return (
    <div>
      <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-transparent" style={{ borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <p className="text-[28px] font-medium text-[#111] dark:text-[#f0f0f0] tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
              {creditsLoading ? "—" : creditsBalance.toLocaleString()}
            </p>
            <p className="text-[12px] text-[#888] dark:text-[#777] font-normal">Credits available</p>
          </div>
          <div className="border-t sm:border-t-0 sm:border-l border-[#e5e5e5] dark:border-transparent pt-4 sm:pt-0 sm:pl-6">
            <p className="text-[28px] font-medium text-[#111] dark:text-[#f0f0f0] tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
              {creditsLoading ? "—" : `€${creditsBalanceEur.toFixed(2)}`}
            </p>
            <p className="text-[12px] text-[#888] dark:text-[#777] font-normal">Balance value</p>
          </div>
        </div>
        <div className="mt-4 h-1.5 w-full rounded-full bg-[#e5e5e5] dark:bg-[#333] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${freeUsedPct}%`,
              backgroundColor: freeUsedPct >= 90 ? '#ef4444' : freeUsedPct >= 70 ? '#f59e0b' : '#16a34a',
            }}
          />
        </div>
        <div className="mt-2.5 flex items-center gap-4 text-[12px] text-[#888] dark:text-[#777] font-normal">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#16a34a]" /> Free: {creditsLoading ? "€" : `${(FREE_UNITS_TOTAL - freeUnitsRemaining).toLocaleString()} / ${FREE_UNITS_TOTAL.toLocaleString()}`}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#818cf8]" /> Paid: {creditsLoading ? "€" : mUsage.creditUnitsUsed.toLocaleString()}
          </span>
        </div>
        {!creditsLoading && freeUnitsRemaining <= 0 && (
          <p className="text-[11px] text-red-500 mt-2">Free tier exhausted € CDN operations consume credits.</p>
        )}
      </div>

      <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-transparent" style={{ borderRadius: 16, padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginBottom: 16 }}>
        <div>
          <p className="text-[15px] font-medium text-[#111] dark:text-[#f0f0f0] mb-1.5">Buy Credits</p>
          <p className="text-[13px] text-[#888] dark:text-[#777] mb-3 font-normal leading-snug">Top up your credits to keep using CDN and storage operations</p>
          <div className="grid grid-cols-3 gap-2">
            {[{ eur: 10, credits: 20 }, { eur: 20, credits: 40 }, { eur: 50, credits: 100 }].map(pkg => (
              <button
                key={pkg.eur}
                onClick={() => purchaseCredits(pkg.eur)}
                disabled={purchaseLoading !== null}
                className="flex flex-col items-center justify-center gap-0.5 hover:bg-[#ebebeb] dark:hover:bg-[#222] active:scale-[0.97] transition-all duration-75 disabled:opacity-40 bg-[#ffffff] dark:bg-[#1c1c1c] border border-[#e5e5e5] dark:border-transparent"
                style={{ height: 52, borderRadius: 10 }}
              >
                {purchaseLoading === pkg.eur ? (
                  <MIcon name="progress_activity" size={16} className="animate-spin text-[#333] dark:text-[#ccc]" />
                ) : (
                  <>
                    <span className="text-[14px] font-medium text-[#111] dark:text-[#f0f0f0]">€{pkg.eur}</span>
                    <span className="text-[11px] text-[#16a34a] font-medium">{pkg.credits} credits</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="border-l border-[#e5e5e5] dark:border-transparent pl-4 flex flex-col justify-between">
          <div>
            <p className="text-[15px] font-medium text-[#111] dark:text-[#f0f0f0] mb-1.5">Custom Amount</p>
            <p className="text-[13px] text-[#888] dark:text-[#777] font-normal leading-snug">Enter any amount starting from €10</p>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 flex items-center gap-1.5 bg-[#ffffff] dark:bg-[#1c1c1c] border border-[#e5e5e5] dark:border-transparent" style={{ borderRadius: 12, paddingLeft: 12, paddingRight: 12, height: 42 }}>
              <span className="text-[14px] text-[#888] dark:text-[#777] font-medium">€</span>
              <input
                type="number"
                min="10"
                placeholder="10"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                className="w-full bg-transparent text-[14px] text-[#111] dark:text-[#f0f0f0] outline-none placeholder-[#ccc] font-medium"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              />
            </div>
            <button
              onClick={handleCustomPurchase}
              disabled={purchaseLoading !== null || !customAmount}
              className="inline-flex items-center justify-center hover:bg-[#ebebeb] dark:hover:bg-[#222] active:scale-[0.97] transition-all duration-75 disabled:opacity-40 disabled:cursor-not-allowed text-[#333] dark:text-[#ccc] bg-[#ffffff] dark:bg-[#1c1c1c] border border-[#e5e5e5] dark:border-transparent"
              style={{ width: 64, height: 42, borderRadius: 12, fontSize: 14, fontWeight: 500 }}
            >
              {purchaseLoading !== null && customAmount ? <MIcon name="progress_activity" size={16} className="animate-spin" /> : "Buy"}
            </button>
          </div>
        </div>
      </div>

      {creditsError && (
        <div className="bg-[rgba(239,68,68,0.06)] dark:bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.15)] dark:border-[rgba(239,68,68,0.2)]" style={{ borderRadius: 14, padding: '8px 12px', marginBottom: 16 }}>
          <p className="text-[12px] text-red-500">{creditsError}</p>
        </div>
      )}

      <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-transparent" style={{ borderRadius: 14 }}>
        <div className="flex items-center justify-between" style={{ minHeight: 38, paddingLeft: 12, paddingRight: 12, borderRadius: 14 }}>
          <span className="text-[13px] text-[#888] dark:text-[#777]">Current plan</span>
          <span className="text-[13px] font-medium text-[#111] dark:text-[#f0f0f0]">{TIER_LABELS[currentTier]}</span>
        </div>
        <div className="flex items-center justify-between border-t border-[#ebebeb] dark:border-transparent" style={{ minHeight: 38, paddingLeft: 12, paddingRight: 12 }}>
          <span className="text-[13px] text-[#888] dark:text-[#777]">Credit rate</span>
          <span className="text-[13px] text-[#333] dark:text-[#ccc]">1 credit = 1,000 op-units</span>
        </div>
        <div className="flex items-center justify-between border-t border-[#ebebeb] dark:border-transparent" style={{ minHeight: 38, paddingLeft: 12, paddingRight: 12 }}>
          <span className="text-[13px] text-[#888] dark:text-[#777]">Operations</span>
          <span className="text-[13px] text-[#333] dark:text-[#ccc]">Upload/delete = 4 units, Download = 1 unit</span>
        </div>
        <p className="text-[11px] text-[#aaa] px-3 pb-2.5">Credits expire 6 months after purchase.</p>
      </div>
    </div>
  )
}

function IntegrationsTab() {
  return (
    <div className="space-y-4">
      <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-transparent" style={{ borderRadius: 16, padding: '14px 16px' }}>
        <p className="text-[13px] text-[#333] dark:text-[#ccc] font-medium mb-1">Coming soon</p>
        <p className="text-[13px] text-[#888] dark:text-[#777] leading-relaxed">
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
      <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-transparent" style={{ borderRadius: 16, padding: '14px 16px' }}>
        <p className="text-[13px] text-[#666] dark:text-[#888] leading-relaxed">
          Hypastack stores <span className="text-[#111] dark:text-[#f0f0f0] font-medium">encrypted usernames</span>,{" "}
          <span className="text-[#111] dark:text-[#f0f0f0] font-medium">hashed access keys</span>,{" "}
          <span className="text-[#111] dark:text-[#f0f0f0] font-medium">encrypted filenames</span>, and{" "}
          <span className="text-[#111] dark:text-[#f0f0f0] font-medium">metadata-stripped assets</span>.{" "}
          No emails, no IPs, no passwords, no plaintext PII - ever.
        </p>
      </div>

      <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-transparent" style={{ borderRadius: 16 }}>
        <div
          className="flex items-center justify-between"
          style={{ height: 38, paddingLeft: 12, paddingRight: 6, borderRadius: 10 }}
        >
          <span className="text-[13px] text-[#888] dark:text-[#777]">Inactivity purge</span>
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
                className={`w-[70px] text-center focus:outline-none bg-[#ffffff] dark:bg-[#1c1c1c] border border-[#e5e5e5] dark:border-transparent text-[#111] dark:text-[#f0f0f0] ${!isPaid ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ height: 28, borderRadius: 8, fontSize: 13, fontWeight: 500 }}
                placeholder="7"
              />
            </div>
            <span className="text-[12px] text-[#aaa]">days</span>
            <button
              onClick={handlePurgeSave}
              disabled={!isPaid || purgeSaving || purgeInput === String(purgeDays)}
              className={`hover:bg-[#ebebeb] dark:hover:bg-[#222] active:scale-[0.97] transition-all duration-75 disabled:opacity-40 disabled:cursor-not-allowed border ${purgeSaved ? "text-[#16a34a] bg-[rgba(22,163,74,0.08)] border-transparent" : "text-[#333] dark:text-[#ccc] bg-[#ffffff] dark:bg-[#1c1c1c] border-[#e5e5e5] dark:border-transparent"}`}
              style={{ height: 28, paddingLeft: 10, paddingRight: 10, borderRadius: 8, fontSize: 13, fontWeight: 500 }}
            >
              {purgeSaved ? "Saved" : purgeSaving ? "..." : "Save"}
            </button>
          </div>
        </div>
        {purgeError && (
          <p className="text-[11px] text-red-500 px-3 pb-2">{purgeError}</p>
        )}
      </div>

      {!isPaid && (
        <p className="text-[11px] text-[#aaa] px-1">
          Fixed at <span className="text-[#888] dark:text-[#777] font-medium">7 days</span> for free accounts. Upgrade to customize.
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
      className="flex items-center gap-4 px-4 py-3.5 hover:bg-[#f0f0f0] dark:hover:bg-[#2a2a2a] transition-colors"
    >
      <div className="h-10 w-10 rounded-[10px] bg-[#111]/8 flex items-center justify-center text-[#555] shrink-0">
        <MIcon name={icon} size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-[#111] dark:text-[#f0f0f0]">{title}</p>
        <p className="text-[13px] text-[#888] dark:text-[#777] truncate font-normal">{description}</p>
      </div>
      <MIcon name="chevron_right" size={20} className="text-[#aaa] shrink-0" />
    </a>
  )
}
