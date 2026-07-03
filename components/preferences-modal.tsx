"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "motion/react"
import Cropper from "react-easy-crop"
import { MIcon } from "@/components/ui/material-icon"
import { useManage } from "@/hooks/useManage"
import { useTheme } from "@/hooks/useTheme"
import { useLanguage } from "@/hooks/useLanguage"
import { getSessionKey, encryptE2E } from "@/lib/security/cryptoClient"
import { hypaConfirm } from "@/components/ui/hypa-notif"
import { type PreferencesTier, API_BASE } from "@/constants"
import { PLAN_INFO, type PlanInfo } from "@/constants/plans"
import { apiFetch } from "@/lib/http/fetch"
import { DISPLAY_NAME_CHANGE_COOLDOWN_MS, NICKNAME_CHANGE_COOLDOWN_MS } from "@/constants/profile"

export type { PreferencesTier }
export type PreferencesTab = "general" | "account" | "plans" | "billing" | "integrations" | "security"

export interface PreferencesUser {
  id: string
  nickname: string
  avatarUrl: string | null
  bannerUrl?: string | null
  displayName?: string | null
  displayNameChangedAt?: string | null
  nicknameChangedAt?: string | null
  verified?: boolean
  premium: boolean
  tier?: PreferencesTier
  inactivityPurgeDays?: number
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

// Format a storage percentage to at most 1 decimal. Tiny non-zero usage floors
// to 0.1% so it never reads as "0%" when some space is actually used.
function formatStoragePct(pct: number): string {
  if (pct <= 0) return "0"
  if (pct < 0.1) return "0.1"
  return String(Math.round(pct * 10) / 10)
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
              className="relative w-full h-full sm:w-full sm:max-w-[1060px] sm:h-[720px] sm:max-h-[92vh] flex flex-col pointer-events-auto bg-[#f0f0f0] dark:bg-[#0e0f10] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] rounded-none sm:rounded-[20px]"
              style={{
                boxShadow: '0 24px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.08)',
                padding: 4,
              }}
            >
              <div className="flex flex-col sm:flex-row w-full h-full gap-[3px] overflow-hidden">
              <div className="sm:hidden shrink-0 bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-transparent dark:border-[rgba(255,255,255,0.06)] pt-3 pb-1 rounded-md flex flex-col">
                <div className="flex items-center justify-between px-4 pb-3 pt-1">
                  <span className="text-[17px] font-semibold text-[#111] dark:text-white dark:text-[#f0f0f0]">Settings</span>
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

              <div className="hidden sm:flex w-[210px] shrink-0 bg-[#f4f4f4] dark:bg-[rgba(255,255,255,0.02)] border border-transparent dark:border-[rgba(255,255,255,0.06)] rounded-[16px] px-3 pt-6 pb-4 flex-col">
                <div className="space-y-0.5">
                  <TabButton active={active === "general"} onClick={() => setActive("general")} label="General" layoutIdPrefix="desktop" />
                  <TabButton active={active === "account"} onClick={() => setActive("account")} label="Account" layoutIdPrefix="desktop" />
                  <TabButton active={active === "plans"} onClick={() => setActive("plans")} label="Plans" layoutIdPrefix="desktop" />
                  <TabButton active={active === "billing"} onClick={() => setActive("billing")} label="Billing" layoutIdPrefix="desktop" />
                  <TabButton active={active === "integrations"} onClick={() => setActive("integrations")} label="Integrations" layoutIdPrefix="desktop" />
                  <TabButton active={active === "security"} onClick={() => setActive("security")} label="Security" layoutIdPrefix="desktop" />
                </div>
              </div>

              <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-white dark:bg-[#0e0f10] rounded-[16px] overflow-hidden">
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

function TabButton({ active, onClick, label, layoutIdPrefix }: { active: boolean; onClick: () => void; label: string; layoutIdPrefix: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative sm:w-full text-left whitespace-nowrap shrink-0 transition-all duration-200 rounded-full ${
        active
          ? "text-[#111111] dark:text-[#f0f0f0] font-medium"
          : "text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] hover:bg-[#ebebeb] dark:hover:bg-[rgba(255,255,255,0.04)] hover:text-[#333] dark:hover:text-[#ccc] active:scale-[0.97] font-medium"
      }`}
      style={{
        height: 34,
        paddingLeft: 12,
        paddingRight: 12,
        fontSize: 14,
      }}
    >
      {active && (
        <motion.div
          layoutId={`pref-tab-${layoutIdPrefix}`}
          className="absolute inset-0 bg-white dark:bg-[rgba(255,255,255,0.1)] rounded-full"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  )
}

function GeneralTab() {
  const { theme, setTheme } = useTheme()
  const { language, languages, setLanguage } = useLanguage()
  const [langOpen, setLangOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]" style={{ borderRadius: 12, padding: '14px 16px' }}>
        <p className="text-[12px] font-medium text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] mb-3">Appearance</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-[520px]">
          <ThemeTile variant="system" label="System" active={theme === "system"} onClick={() => setTheme("system")} />
          <ThemeTile variant="light" label="Light" active={theme === "light"} onClick={() => setTheme("light")} />
          <ThemeTile variant="dark" label="Dark" active={theme === "dark"} onClick={() => setTheme("dark")} />
        </div>
      </div>

      <div
        className="flex items-center justify-between cursor-pointer hover:bg-[#f0f0f0] dark:hover:bg-[rgba(255,255,255,0.04)] transition-all duration-75 bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]"
        style={{ height: 38, paddingLeft: 12, paddingRight: 10, borderRadius: 12 }}
        onClick={() => setLangOpen((o) => !o)}
      >
        <span className="text-[13px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa]">Language</span>
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0]">
          {language.label} <span className="text-[#999] dark:text-[#898e97] dark:text-[#a1a1aa]">({language.native})</span>
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
            className="relative z-[110] -mt-2 w-full max-h-[280px] overflow-y-auto bg-[#ffffff] dark:bg-[#0e0f10] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)]"
            style={{ padding: 4, borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
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
                      ? "text-[#111] dark:text-white dark:text-[#f0f0f0] font-medium bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.06)]"
                      : "text-[#333] dark:text-[#f7f8f8] dark:text-[#ccc] hover:bg-[#f5f5f5] dark:hover:bg-[rgba(255,255,255,0.04)] active:scale-[0.97]"
                  }`}
                  style={{ height: 34, paddingLeft: 12, paddingRight: 12, borderRadius: 6, fontSize: 13, border: 'none', cursor: 'pointer' }}
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
        className="flex items-center justify-between hover:bg-[#f0f0f0] dark:hover:bg-[rgba(255,255,255,0.04)] transition-all duration-75 bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]"
        style={{ height: 38, paddingLeft: 12, paddingRight: 12, borderRadius: 12 }}
      >
        <span className="text-[13px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa]">Support</span>
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#333] dark:text-[#f7f8f8] dark:text-[#ccc]">t.me/hypastack <MIcon name="open_in_new" size={14} /></span>
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
        className={`relative w-full aspect-[5/3] rounded-[8px] overflow-hidden transition-all ${
          active
            ? "ring-2 ring-[#111] dark:ring-[#e3e3e3] ring-offset-0"
            : "border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] hover:border-[#ccc] dark:hover:border-[rgba(255,255,255,0.15)]"
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
      <span className={`text-[13px] ${active ? "font-medium text-[#111] dark:text-white dark:text-[#f0f0f0]" : "font-normal text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa]"}`}>
        {label}
      </span>
    </div>
  )
}

function ThemeMock({ dark }: { dark: boolean }) {
  const bg = dark ? "#08090a" : "#f5f5f5"
  const sidebar = dark ? "#151616" : "#e8e8e8"
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

      apiFetch("/api/v2/auth/upload-avatar", {
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
        className="relative w-full max-w-[420px] flex flex-col bg-[#f0f0f0] dark:bg-[#0e0f10] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] sm:rounded-[20px]"
        style={{
          boxShadow: '0 24px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.08)',
          padding: 4,
        }}
      >
        <div className="relative w-full flex flex-col bg-white dark:bg-[#08090a] rounded-[16px] overflow-hidden">
        <div className="relative w-full overflow-hidden" style={{ height: 400 }}>
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

        <div className="flex gap-3 px-4 py-4">
          <button 
            onClick={onClose} 
            className="flex-1 relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)] group-hover:to-[rgba(255,255,255,0.25)] transition-colors duration-300" />
            <div className="relative bg-[#151616] rounded-full w-full h-[40px] flex items-center justify-center text-[#f7f8f8] text-[14px] font-medium">
              Cancel
            </div>
          </button>
          <button 
            onClick={handleUpload} 
            className="flex-1 relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(255,255,255,0.15)] to-[rgba(255,255,255,0.25)] group-hover:to-[rgba(255,255,255,0.35)] transition-colors duration-300" />
            <div className="relative bg-[#f7f8f8] rounded-full w-full h-[40px] flex items-center justify-center text-[#111111] text-[14px] font-medium">
              Save
            </div>
          </button>
        </div>
        </div>
      </motion.div>
    </div>
  )
}

function AccountTab({ user, storage, onSwitchTab }: { user: PreferencesUser; storage: PreferencesStorage | null; onSwitchTab?: (tab: PreferencesTab) => void }) {
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

      <div className="flex flex-col sm:flex-row sm:items-center items-start gap-4 sm:gap-5 mb-4 bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]" style={{ borderRadius: 12, padding: '16px 20px' }}>
        <div className="relative h-[84px] w-[84px] shrink-0">
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <img
              src={avatarSrc}
              alt={user.nickname}
              className="absolute inset-0 w-full h-full object-cover rounded-full select-none pointer-events-none"
              draggable={false}
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp' }}
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
                if (f && ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type) && f.size <= 10 * 1024 * 1024) {
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
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(user.id)
                setCopiedId(true)
                setTimeout(() => setCopiedId(false), 2000)
              }}
              className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)] group-hover:to-[rgba(255,255,255,0.25)] transition-colors duration-300" />
              <div className="relative bg-[#151616] rounded-full h-[26px] px-3 flex items-center gap-1.5 text-[#f7f8f8] text-[12px] font-medium">
                <MIcon name={copiedId ? "check" : "content_copy"} size={13} />
                {copiedId ? "Copied" : "Copy user ID"}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)] group-hover:to-[rgba(255,255,255,0.25)] transition-colors duration-300" />
              <div className="relative bg-[#151616] rounded-full h-[26px] px-3 flex items-center gap-1.5 text-[#f7f8f8] text-[12px] font-medium">
                <MIcon name="edit" size={13} />
                Edit
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]" style={{ borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
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
        <div className="mt-4 h-1.5 w-full rounded-full bg-[#e5e5e5] dark:bg-[#333] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#111] transition-all duration-500"
            style={{ width: `${Math.min(100, usedPct)}%` }}
          />
        </div>
        <div className="mt-2.5 flex items-center gap-4 text-[12px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] font-normal">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#111]" /> Drive
          </span>
        </div>
      </div>

      {!user.premium && (
        <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)] grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
          <div>
            <p className="text-[15px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0] mb-1.5">Upgrade</p>
            <p className="text-[13px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] mb-3 font-normal leading-snug">Level up your storage space and get many other benefits</p>
            <button
              onClick={() => onSwitchTab?.("plans")}
              className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)] group-hover:to-[rgba(255,255,255,0.25)] transition-colors duration-300" />
              <div className="relative bg-[#151616] rounded-full h-[36px] px-5 flex items-center justify-center text-[#f7f8f8] text-[14px] font-semibold">
                Upgrade
              </div>
            </button>
          </div>
          <div className="border-t sm:border-t-0 sm:border-l border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] pt-4 sm:pt-0 sm:pl-4">
            <p className="text-[15px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0] mb-1.5">Empty trash</p>
            <p className="text-[13px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] mb-3 font-normal leading-snug">Items in trash will be deleted permanently</p>
            <button
              type="button"
              onClick={handleEmptyTrash}
              disabled={trashLoading || files.length === 0}
              className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)] group-hover:to-[rgba(255,255,255,0.25)] transition-colors duration-300" />
              <div className="relative bg-[#151616] rounded-full h-[36px] px-5 flex items-center justify-center text-[#f7f8f8] text-[14px] font-medium">
                {trashLoading ? "Deleting..." : "Empty trash"}
              </div>
            </button>
          </div>
        </div>
      )}

      {user.premium && <BrandingSection user={user} />}

      <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)] flex flex-col" style={{ borderRadius: 12, padding: '16px 20px' }}>
        <div>
          <p className="text-[14px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0] mb-1">Delete account</p>
          <p className="text-[13px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa]">
            All data will be permanently erased. This cannot be undone.
          </p>
        </div>
        <div className="pt-4 flex justify-end">
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleteAccountLoading}
            className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150 disabled:opacity-40"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(239,68,68,0.2)] to-[rgba(239,68,68,0.4)] group-hover:to-[rgba(239,68,68,0.6)] transition-colors duration-300" />
            <div className="relative bg-[#1a0808] rounded-full h-[32px] px-5 flex items-center justify-center text-red-400 text-[13px] font-medium">
              {deleteAccountLoading ? "Deleting..." : "Delete account"}
            </div>
          </button>
        </div>
      </div>
    </div>
    <EditProfileDialog open={editing} user={user} onClose={() => setEditing(false)} />
    </>
  )
}

// Paid-plan branding for the download page: a banner + public @display name that
// appear above every file the user shares. Mirrors the avatar upload flow.
function BrandingSection({ user }: { user: PreferencesUser }) {
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
    if (file.size > 10 * 1024 * 1024) {
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
          <button
            type="button"
            onClick={handleRemoveBanner}
            disabled={removing}
            className="h-[32px] px-3 rounded-full text-[13px] font-medium text-[#888] dark:text-[#898e97] hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.06)] hover:text-[#333] dark:hover:text-[#f7f8f8] transition-colors disabled:opacity-40"
          >
            {removing ? "Removing..." : "Remove"}
          </button>
        )}
      </div>

      <p className="text-[12px] font-medium text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] mt-4 mb-1.5">Display name</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center bg-white dark:bg-[rgba(255,255,255,0.06)] border border-[rgba(0,0,0,0.1)] dark:border-[rgba(255,255,255,0.08)] rounded-[8px]" style={{ height: 36, paddingLeft: 10, paddingRight: 10 }}>
          <span className="text-[#999] dark:text-[#6b6b6b] text-[13px] shrink-0">@</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value.replace(/[^A-Za-z0-9 ._-]/g, "").slice(0, 32))}
            placeholder="yourname"
            className="flex-1 min-w-0 bg-transparent focus:outline-none text-[#111] dark:text-[#f0f0f0]"
            style={{ fontSize: 13, fontWeight: 500, paddingLeft: 2 }}
          />
        </div>
        <button
          type="button"
          onClick={handleSaveName}
          disabled={savingName || !nameChanged || nameCooldownMs > 0}
          className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)] group-hover:to-[rgba(255,255,255,0.25)] transition-colors duration-300" />
          <div className="relative bg-[#151616] rounded-full h-[32px] px-4 flex items-center justify-center text-[#f7f8f8] text-[13px] font-medium">
            {savingName ? "Saving..." : "Save"}
          </div>
        </button>
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

function EditProfileDialog({
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
    } catch (err: any) {
      setError(err?.message || "Well.. something got tangled up, try again later.")
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
            <div className="relative w-full flex flex-col bg-[#f8f8f8] dark:bg-[rgba(255,255,255,0.04)] rounded-[12px]">
              <div className="p-5 space-y-3">
                <div>
                  <p className="text-[12px] font-medium text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] mb-1.5">Username</p>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    autoFocus
                    className="w-full focus:outline-none bg-white dark:bg-[rgba(255,255,255,0.06)] border border-[rgba(0,0,0,0.1)] dark:border-[rgba(255,255,255,0.08)] text-[#111] dark:text-[#f0f0f0] rounded-[8px]"
                    style={{ height: 36, paddingLeft: 12, paddingRight: 12, fontSize: 13, fontWeight: 500 }}
                  />
                </div>

                {nicknameError && (
                  <p className="text-[11px] text-red-500">{nicknameError}</p>
                )}
                {!nicknameError && nickCooldownMs > 0 && (
                  <p className="text-[11px] text-[#888] dark:text-[#898e97]">You can change your username again in {nickCooldownDays === 1 ? "1 day" : `${nickCooldownDays} days`}.</p>
                )}
                {error && (
                  <p className="text-[11px] text-red-500">{error}</p>
                )}
              </div>
            </div>

            <div className="flex gap-1.5" style={{ marginTop: 6 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 flex items-center justify-center rounded-full hover:bg-[rgba(255,255,255,0.06)] active:scale-[0.97] transition-all duration-150 disabled:opacity-50 text-[#898e97] text-[14px] font-medium"
                style={{ height: 38 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !isNicknameValid || nickCooldownLocked}
                className="relative flex-1 inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ height: 38 }}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)] group-hover:to-[rgba(255,255,255,0.25)] transition-colors duration-300" />
                <div className="relative bg-[#151616] rounded-full w-full h-full flex items-center justify-center text-[#f7f8f8] text-[14px] font-semibold">
                  {saving ? "Saving..." : "Save"}
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}



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
        <div className="inline-flex p-1 bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.02)] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.06)]" style={{ borderRadius: 12 }}>
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`px-4 py-1.5 text-[14px] transition-colors ${
              billing === "monthly" ? "bg-white dark:bg-[rgba(255,255,255,0.08)] text-[#111] dark:text-[#f7f8f8] font-medium shadow-sm" : "text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] font-normal"
            }`}
            style={{ borderRadius: 8 }}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={`px-4 py-1.5 text-[14px] transition-colors ${
              billing === "annual" ? "bg-white dark:bg-[rgba(255,255,255,0.08)] text-[#111] dark:text-[#f7f8f8] font-medium shadow-sm" : "text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] font-normal"
            }`}
            style={{ borderRadius: 8 }}
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

        <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)] flex flex-col" style={{ borderRadius: 12, padding: 16 }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[22px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0] tracking-tight">{selectedPlan.label}</p>
            {isSelectedCurrent && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#111]/10 text-[#333] dark:text-[#f7f8f8] dark:text-[#ccc]">
                Current
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] mb-4 font-normal">
            {selectedPlan.key === "free"
              ? "Free forever"
              : isSelectedCurrent
                ? "Thanks for supporting Hypastack."
                : `Billed ${billing === "annual" ? "annually" : "once"}.`}
          </p>
          <p className="text-[14px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0] mb-2">Plan details</p>
          <ul className="space-y-1.5 text-[14px] text-[#444] dark:text-[#a1a1aa] font-normal mb-5">
            {selectedPlan.details.map((d) => (
              <li key={d} className="flex items-start gap-2">
                <MIcon name="check" size={16} className="text-[#555] shrink-0 mt-0.5" />
                <span>{d}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto">
            {!isSelectedCurrent && selectedPlan.key !== "free" && (
              <button
                onClick={() => onSwitchTab?.("billing")}
                className="relative w-full inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-[#242526] via-[#242526] to-[#666c73] group-hover:to-[#888f98] transition-colors duration-300" />
                <div className="relative bg-[#151616] rounded-full w-full h-[40px] flex items-center justify-center text-[#f7f8f8] text-[14px] font-medium">
                  Switch to {selectedPlan.label}
                </div>
              </button>
            )}
            {!isSelectedCurrent && selectedPlan.key === "free" && (
              <button
                onClick={() => onSwitchTab?.("billing")}
                className="relative w-full inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)] group-hover:to-[rgba(255,255,255,0.25)] transition-colors duration-300" />
                <div className="relative bg-[#151616] rounded-full w-full h-[40px] flex items-center justify-center text-[#f7f8f8] text-[14px] font-medium">
                  Downgrade to Free
                </div>
              </button>
            )}
          </div>
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
      className={`w-full text-left p-4 transition-all relative border overflow-hidden ${
        selected
          ? "bg-white dark:bg-[rgba(255,255,255,0.04)] border-[#111] dark:border-[rgba(255,255,255,0.25)]"
          : "bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] hover:bg-[#f0f0f0] dark:hover:bg-[rgba(255,255,255,0.06)] border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]"
      }`}
      style={{ borderRadius: 12 }}
    >
      {selected && (
        <div className="absolute inset-0 pointer-events-none rounded-[12px] ring-1 ring-inset ring-[rgba(255,255,255,0.1)] dark:ring-[rgba(255,255,255,0.1)]" />
      )}
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#111]/8 text-[#333] dark:text-[#f7f8f8] dark:text-[#ccc] text-[10px] font-semibold tracking-wide">
          {tier}
        </span>
        {current && (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#111]/8 text-[#555]">
            Current
          </span>
        )}
      </div>
      <p className="text-[22px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0] tracking-tight">{size}</p>
      <p className="text-[13px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] mt-0.5 font-normal">{price}</p>
    </button>
  )
}

function BillingTab({ } : { user: PreferencesUser }) {
  return (
    <div className="space-y-4">
      <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]" style={{ borderRadius: 12, padding: '16px 16px' }}>
        <p className="text-[15px] font-normal text-[#111] dark:text-white dark:text-[#f0f0f0] mb-1.5">We're working on it.</p>
        <p className="text-[13px] font-normal text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] leading-relaxed max-w-md">
          Billing not expected until next month, If you want to upgrade your plan, contact Kiko on Telegram: t_usekiko
          <br /><br />
          All donations appreciated, this project is self funded.
        </p>
      </div>
    </div>
  )
}

function IntegrationsTab() {
  return (
    <div className="space-y-4">
      <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]" style={{ borderRadius: 12, padding: '14px 16px' }}>
        <p className="text-[13px] text-[#333] dark:text-[#f7f8f8] dark:text-[#ccc] font-medium mb-1">Let's see..</p>
        <p className="text-[13px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] leading-relaxed">
          I'm currently playing with ideas for integrations, If you actually want Discord webhooks or something else, let me know, i'd rather build stuff you'll actually use
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
      const res = await apiFetch("/api/v2/auth/inactivity-purge", {
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
      <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]" style={{ borderRadius: 12, padding: '14px 16px' }}>
        <p className="text-[13px] text-[#666] dark:text-[#a1a1aa] dark:text-[#888] dark:text-[#898e97] leading-relaxed">
          Hypastack stores <span className="text-[#111] dark:text-white dark:text-[#f0f0f0] font-medium">hashed usernames</span>,{" "}
          <span className="text-[#111] dark:text-white dark:text-[#f0f0f0] font-medium">hashed access keys</span>,{" "}
          <span className="text-[#111] dark:text-white dark:text-[#f0f0f0] font-medium">encrypted files with random filenames</span>, and{" "}
          <span className="text-[#111] dark:text-white dark:text-[#f0f0f0] font-medium">metadata-stripped assets</span>.{" "}
          If you want me to change something up, lmk, i can think of something.
        </p>
      </div>

      <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)] flex flex-col" style={{ borderRadius: 12, padding: '16px 20px' }}>
        <div>
          <p className="text-[14px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0] mb-3">Inactivity purge</p>
        </div>
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
              className={`w-[70px] text-right px-3 focus:outline-none bg-[#ffffff] dark:bg-[rgba(255,255,255,0.02)] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] text-[#111] dark:text-white dark:text-[#f0f0f0] rounded-full ${!isPaid ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ height: 28, fontSize: 13, fontWeight: 500 }}
              placeholder="7"
            />
          </div>
          <span className="text-[12px] text-[#aaa] mr-2">days</span>
          <button
            onClick={handlePurgeSave}
            disabled={!isPaid || purgeSaving || purgeInput === String(purgeDays)}
            className={`relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150 disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <div className={`absolute inset-0 transition-colors duration-300 ${purgeSaved ? "bg-[rgba(22,163,74,0.2)]" : "bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)] group-hover:to-[rgba(255,255,255,0.25)]"}`} />
            <div className={`relative bg-[#151616] rounded-full h-[26px] px-4 flex items-center justify-center text-[12px] font-medium ${purgeSaved ? "text-[#16a34a] bg-[#091a0e]" : "text-[#f7f8f8]"}`}>
              {purgeSaved ? "Saved" : purgeSaving ? "..." : "Save"}
            </div>
          </button>
        </div>
        {purgeError && (
          <p className="text-[11px] text-red-500 pt-3">{purgeError}</p>
        )}
      </div>

      {!isPaid && (
        <p className="text-[11px] text-[#aaa] px-1">
          Fixed at <span className="text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] font-medium">7 days</span> for free accounts, Upgrade to customize.
        </p>
      )}
    </div>
  )
}
