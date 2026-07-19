"use client"

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "motion/react"
import { useAuth } from "@/hooks/useAuth"
import { ManageProvider, useManage } from "@/hooks/useManage"
import { MIcon } from "@/components/ui/material-icon"
import { ShineButton } from "@/components/ui/shine-button"
import { ProgressBar } from "@/components/ui/progress-bar"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { MenuItem } from "@/components/ui/menu-item"
import { ShineBadge } from "@/components/ui/shine-badge"
import { PreferencesModal, type PreferencesTab } from "@/components/preferences-modal"
import { TierAnnouncementModal } from "@/components/tier-announcement-modal"
import { HypaNotifProvider } from "@/components/ui/hypa-notif"
import { useTheme } from "@/hooks/useTheme"
import { PageLogo } from "@/components/page-logo"
import { UploadZone } from "@/components/upload"
import { ManageSkeleton } from "./_skeleton"
import {
  type NavItem,
  SECTION_BUTTONS,
  SIDEBAR_WIDTH,
  STORAGE_KEY_DONATION_NOTICE,
  API_BASE,
} from "@/constants"
import { getTierLimits, normalizeTier, isUnlimited } from "@/constants/tier-limits"

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

function isSectionActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/")
}

function formatStorageSize(bytes: number): string {
  if (!bytes || !isFinite(bytes) || bytes <= 0) return "0B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i]
}

// Format a storage percentage to at most 1 decimal. Tiny non-zero usage floors
// to 0.1% so it never reads as "0%" when some space is actually used.
function formatStoragePct(pct: number): string {
  if (pct <= 0) return "0"
  if (pct < 0.1) return "0.1"
  return String(Math.round(pct * 10) / 10)
}

function sectionTitle(pathname: string): string {
  if (pathname.startsWith("/manage/files")) return "Drive"
  if (pathname.startsWith("/manage/funnel")) return "Funnel"
  if (pathname.startsWith("/manage/cdn")) return "CDN"
  if (pathname.startsWith("/manage/dumpster")) return "Dumpster"
  return "Drive"
}


function NavRow({
  item,
  active,
  onNavigate,
  badge,
}: {
  item: NavItem
  active: boolean
  onNavigate?: () => void
  badge?: React.ReactNode
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group relative flex items-center gap-3 rounded-lg text-[15px] font-medium transition-colors duration-150 cursor-pointer ${
        active
          ? 'bg-[#f4f4f4] dark:bg-[rgba(255,255,255,0.08)] text-[#171717] dark:text-[#f7f8f8]'
          : 'text-[#666] dark:text-[#898e97] hover:bg-[#f4f4f4] dark:hover:bg-[rgba(255,255,255,0.04)] hover:text-[#171717] dark:hover:text-[#f7f8f8]'
      }`}
      style={{
        height: 40,
        paddingLeft: 14,
        paddingRight: 14,
      }}
    >
      <MIcon
        name={item.icon}
        size={20}
        className={`shrink-0 transition-colors ${active ? 'text-[#171717] dark:text-[#f7f8f8]' : 'text-[#666] dark:text-[#898e97] group-hover:text-[#171717] dark:group-hover:text-[#f7f8f8]'}`} 
      />
      <div className="overflow-hidden whitespace-nowrap flex items-center justify-between flex-1">
        <span className="truncate">{item.label}</span>
        {badge && <div className="ml-2 shrink-0">{badge}</div>}
      </div>
    </Link>
  )
}

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ManageProvider>
      <ManageLayoutInner>{children}</ManageLayoutInner>
    </ManageProvider>
  )
}

function ManageLayoutInner({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const { user, stats, files, cdnAssets, isLoading, logout } = useManage()
  const { resolvedTheme } = useTheme()

  const [shouldRedirect, setShouldRedirect] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [preferencesTab, setPreferencesTab] = useState<PreferencesTab>("general")
  const [copiedId, setCopiedId] = useState(false)
  const [showDonationNotice, setShowDonationNotice] = useState(false)

  const openPreferences = useCallback((tab: PreferencesTab) => {
    setPreferencesTab(tab)
    setPreferencesOpen(true)
    setMenuOpen(false)
    setDrawerOpen(false)
  }, [])
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const t = setTimeout(() => setShouldRedirect(true), 1500)
      return () => clearTimeout(t)
    }
  }, [isLoading, isAuthenticated])

  useEffect(() => {
    if (shouldRedirect) router.push("/signin")
  }, [shouldRedirect, router])

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [])

  useEffect(() => {
    document.title = `${sectionTitle(pathname)} | Hypastack`
  }, [pathname])

  useEffect(() => {
    if (pathname === "/manage" || pathname === "/manage/") {
      router.replace("/manage/files")
    }
  }, [pathname, router])

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [drawerOpen])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawerOpen) {
        setDrawerOpen(false)
        return
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [drawerOpen])

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY_DONATION_NOTICE) !== "true") {
      setShowDonationNotice(true)
    }
  }, [])

  if (isLoading) {
    return <ManageSkeleton pathname={pathname} />
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const initials = (user.nickname || "?").charAt(0).toUpperCase()
  const usedPct = stats?.storagePercent ?? 0

  // Sidebar usage indicators for shared file links and CDN assets, against the
  // user's tier caps. Bar goes gray → yellow (past halfway) → red (at the cap).
  const tierLimits = getTierLimits(normalizeTier(user.tier))
  const sharedUsed = files?.length ?? 0
  const cdnUsed = stats?.cdnAssets ?? cdnAssets?.length ?? 0
  const sharedPct = isUnlimited(tierLimits.maxFileLinks) || tierLimits.maxFileLinks <= 0 ? 0 : (sharedUsed / tierLimits.maxFileLinks) * 100
  const cdnPct = isUnlimited(tierLimits.maxCdnLinks) || tierLimits.maxCdnLinks <= 0 ? 0 : (cdnUsed / tierLimits.maxCdnLinks) * 100
  return (
    <>
    <div className={`flex h-screen w-full overflow-hidden bg-[#f0f0f0] dark:bg-[#151515] text-[#171717] dark:text-[#e3e3e3]${resolvedTheme === 'dark' ? ' theme-dark' : ''}`}>
      <aside
        className="hidden lg:flex shrink-0 flex-col sticky top-0 z-10 h-[calc(100vh-16px)] my-2 ml-2 mr-1"
        style={{ width: SIDEBAR_WIDTH }}
      >
        <div className="flex items-center gap-2.5 shrink-0 pt-4 pb-6 px-3">
          <Link href="/" aria-label="Hypastack home" className="shrink-0 transition-transform duration-300">
            <PageLogo size={30} borderRadius={8} darkSrc="https://r2.hypastack.com/cdn/7byi0fl52s1c/favicon.webp" />
          </Link>
          <span className="text-[17px] font-semibold tracking-tight text-black dark:text-[#e3e3e3]">
            Hypastack
          </span>
        </div>

        <nav className="flex-1 min-h-0 px-3 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="space-y-1">
            {SECTION_BUTTONS.map((item) => (
              <NavRow
                key={item.href}
                item={item}
                active={isSectionActive(pathname, item.href)}
              />
            ))}
          </div>
        </nav>

        <div className="px-3 pt-3 pb-3 shrink-0">
          <div className="text-xs text-[#666] dark:text-[#888] font-medium mb-3">
            Usage
          </div>

          <div className="space-y-3">

            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <div className="flex items-center gap-2 text-[#333] dark:text-[#ccc]">
                  <MIcon name="hard_drive" size={15} className="text-[#666] dark:text-[#888]" />
                  <span>Storage</span>
                </div>
                <span className="text-[#666] dark:text-[#888]">{formatStoragePct(usedPct)}%</span>
              </div>
              <ProgressBar value={usedPct} aria-label="Storage used" />
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <div className="flex items-center gap-2 text-[#333] dark:text-[#ccc]">
                  <MIcon name="link" size={15} className="text-[#666] dark:text-[#888]" />
                  <span>Shared Links</span>
                </div>
                <span className="text-[#666] dark:text-[#888]">{sharedUsed}/{isUnlimited(tierLimits.maxFileLinks) ? "∞" : tierLimits.maxFileLinks}</span>
              </div>
              {!isUnlimited(tierLimits.maxFileLinks) && <ProgressBar value={sharedPct} aria-label="Shared links used" />}
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <div className="flex items-center gap-2 text-[#333] dark:text-[#ccc]">
                  <MIcon name="cloud" size={15} className="text-[#666] dark:text-[#888]" />
                  <span>CDN Assets</span>
                </div>
                <span className="text-[#666] dark:text-[#888]">{cdnUsed}/{isUnlimited(tierLimits.maxCdnLinks) ? "∞" : tierLimits.maxCdnLinks}</span>
              </div>
              {!isUnlimited(tierLimits.maxCdnLinks) && <ProgressBar value={cdnPct} aria-label="CDN assets used" />}
            </div>
          </div>
        </div>

        <div ref={menuRef} className="relative flex items-center gap-2 px-3 pb-3 shrink-0">
          <SecondaryButton
            variant="ghost"
            iconOnly
            size="md"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Account menu"
            style={menuOpen ? { backgroundColor: "rgba(255,255,255,0.08)" } : undefined}
          >
            <img decoding="async"
              src={user.avatarUrl ? `${API_BASE}/avatar` : 'https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp'}
              alt={user.nickname}
              className="h-7 w-7 shrink-0 object-cover rounded-full select-none pointer-events-none"
              draggable={false}
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp' }}
            />
          </SecondaryButton>

          <ShineButton
            onClick={() => openPreferences("plans")}
            size="md"
            className="flex-1"
          >
            Upgrade plan
          </ShineButton>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                key="account-popover"
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
                className="absolute bottom-full left-3 mb-2 z-10 bg-white dark:bg-[#1e1e20] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] p-1.5"
                style={{
                  width: 264,
                  boxShadow: '0 16px 48px rgba(0,0,0,0.16), 0 3px 10px rgba(0,0,0,0.08)'
                }}
              >
                <div className="flex items-center gap-3 rounded-[10px] bg-[#f7f7f8] dark:bg-[rgba(255,255,255,0.035)] border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] px-3 py-2.5">
                  <img
                    decoding="async"
                    src={user.avatarUrl ? `${API_BASE}/avatar` : 'https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp'}
                    alt={user.nickname}
                    className="h-9 w-9 shrink-0 rounded-full object-cover select-none pointer-events-none"
                    draggable={false}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp' }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 truncate text-[13px] font-semibold leading-tight text-[#111] dark:text-[#f0f0f0]">{user.nickname}</p>
                      <ShineBadge>{tierLimits.label}</ShineBadge>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-[#8b8b90] dark:text-[#8b9099]">{user.id}</p>
                  </div>
                  <SecondaryButton
                    variant="ghost"
                    iconOnly
                    size="xs"
                    onClick={() => { navigator.clipboard?.writeText(user.id); setCopiedId(true); setTimeout(() => setCopiedId(false), 1500) }}
                    title={copiedId ? "Copied" : "Copy UUID"}
                    aria-label="Copy UUID"
                    style={copiedId ? { color: "#34d399" } : undefined}
                  >
                    <MIcon name={copiedId ? "check" : "content_copy"} size={14} />
                  </SecondaryButton>
                </div>

                <div className="mt-1.5 space-y-0.5">
                  <MenuItem
                    icon={<MIcon name="person" size={18} />}
                    onClick={() => { setMenuOpen(false); openPreferences("account"); }}
                  >
                    Account settings
                  </MenuItem>

                  <MenuItem
                    icon={<MIcon name="settings" size={18} />}
                    onClick={() => { setMenuOpen(false); openPreferences("general"); }}
                  >
                    Workspace settings
                  </MenuItem>

                  <MenuItem
                    icon={<MIcon name="card_giftcard" size={18} />}
                    onClick={() => { setMenuOpen(false); }}
                  >
                    Refer and earn
                  </MenuItem>
                </div>

                <div className="mt-1.5">
                  <ShineButton
                    size="md"
                    fullWidth
                    onClick={() => { setMenuOpen(false); logout(); }}
                    color="#dc2626"
                    hoverColor="#b91c1c"
                    style={{ gap: 8 }}
                  >
                    <MIcon name="logout" size={16} />
                    Log out
                  </ShineButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[38] lg:hidden"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            onClick={() => setDrawerOpen(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="sheet"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.06, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 130 || info.velocity.y > 500) setDrawerOpen(false)
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-x-0 bottom-0 z-[39] flex flex-col safe-area-bottom lg:hidden"
            style={{
              maxHeight: '90vh',
              backgroundColor: resolvedTheme === 'dark' ? '#1e1e20' : '#ffffff',
              borderRadius: '20px 20px 0 0',
              borderTop: resolvedTheme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid #ebebeb',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.22)',
              willChange: 'transform',
            }}
          >
              {/* Grab handle — the sheet drags from here (or any empty space) to dismiss. */}
              <div className="flex justify-center pt-3 pb-2.5 cursor-grab active:cursor-grabbing">
                <div style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: resolvedTheme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />
              </div>

              <div className="flex flex-col gap-1 px-3 py-2">
                {SECTION_BUTTONS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3.5 rounded-[12px] px-3.5 transition-colors active:scale-[0.99] ${
                      isSectionActive(pathname, item.href)
                        ? "bg-white dark:bg-[rgba(255,255,255,0.08)] text-[#171717] dark:text-[#f7f8f8]"
                        : "text-[#666] dark:text-[#898e97] active:bg-[#f5f5f5] dark:active:bg-[rgba(255,255,255,0.04)]"
                    }`}
                    style={{ height: 50 }}
                  >
                    <MIcon name={item.icon} size={20} />
                    <span className="text-[15px] font-medium">{item.label}</span>
                  </Link>
                ))}
              </div>

              <div className="mx-3 mt-1 border-t border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]" />
              <div className="flex items-center gap-3 px-4 pt-3" style={{ paddingBottom: 'calc(18px + env(safe-area-inset-bottom))' }}>
                <img
                  src={user.avatarUrl ? `${API_BASE}/avatar` : 'https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp'}
                  alt={user.nickname}
                  className="h-10 w-10 shrink-0 rounded-full object-cover select-none pointer-events-none"
                  draggable={false}
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-[#171717] dark:text-[#f7f8f8]">{user.nickname}</p>
                  <p className="text-[12px] text-[#888] dark:text-[#898e97]">{tierLimits.label} plan</p>
                </div>
                <SecondaryButton
                  variant="ghost"
                  iconOnly
                  onClick={() => { setDrawerOpen(false); openPreferences("general") }}
                  aria-label="Settings"
                  style={{ width: 40, height: 40, borderRadius: 12 }}
                >
                  <MIcon name="settings" size={18} />
                </SecondaryButton>
                <SecondaryButton
                  variant="ghost"
                  danger
                  onClick={() => { setDrawerOpen(false); logout() }}
                  style={{ height: 40, borderRadius: 12, fontSize: 14, paddingLeft: 12, paddingRight: 12 }}
                >
                  Sign out
                </SecondaryButton>
              </div>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 min-w-0 flex-col h-[calc(100vh-16px)] my-2 ml-1 mr-2 rounded-[12px] bg-white dark:bg-[#1e1e20] overflow-hidden relative" style={{ border: 'none', boxShadow: 'none' }}>
        <header
          className="flex shrink-0 items-center gap-2 px-3 pt-1.5 pb-1.5 bg-white dark:bg-[#1e1e20] lg:hidden safe-area-top relative z-10"
          style={{ borderBottom: resolvedTheme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f0f0f0' }}
        >
          <SecondaryButton
            variant="ghost"
            iconOnly
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            style={{ width: 40, height: 40, borderRadius: '50%', marginLeft: -4 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6"></line>
              <line x1="4" y1="12" x2="20" y2="12"></line>
              <line x1="4" y1="18" x2="20" y2="18"></line>
            </svg>
          </SecondaryButton>
        </header>

        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 overflow-y-auto">
            <motion.main
              key={pathname}
              initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="h-full flex flex-col px-3 sm:px-5 lg:px-6 pt-4 pb-6"
            >
              {children}
            </motion.main>
          </div>
        </div>
      </div>

      <PreferencesModal
        open={preferencesOpen}
        initialTab={preferencesTab}
        onClose={() => setPreferencesOpen(false)}
        user={user}
        storage={stats}
      />

      <TierAnnouncementModal />
      <HypaNotifProvider />

    </div>

    <AnimatePresence>
      {showDonationNotice && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
          className="fixed bottom-4 right-4 left-4 sm:left-auto z-[9999] w-auto sm:w-full sm:max-w-sm bg-white dark:bg-[#1e1e20] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)]"
          style={{ borderRadius: 14, padding: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <div className="flex flex-col">
            <h3 className="text-[15px] font-semibold text-[#111] dark:text-[#f0f0f0] mb-2 leading-tight">A quick note</h3>
            <p className="text-[13.5px] text-[#666] dark:text-[#a1a1aa] leading-relaxed mb-5">
              Please don't reveal photos for no reason and spam it, this will lower costs of keeping this platform alive. If you want, you can support us by clicking Donate.
            </p>
            <div className="flex items-center gap-2.5">
              <a
                href="https://ko-fi.com/hypastack"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center bg-[#facc15] hover:bg-[#eab308] text-black font-semibold transition-colors active:scale-[0.97]"
                style={{ height: 34, paddingLeft: 16, paddingRight: 16, borderRadius: 6, fontSize: 13 }}
              >
                Donate
              </a>
              <SecondaryButton
                onClick={() => {
                  setShowDonationNotice(false)
                  localStorage.setItem(STORAGE_KEY_DONATION_NOTICE, "true")
                }}
                size="sm"
                style={{ height: 34, borderRadius: 6 }}
              >
                Hide notification
              </SecondaryButton>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/*
      Persistent, always-mounted upload zone. It stays idle/hidden during normal
      use, but on a fresh page load (after the browser was quit or the tab closed
      mid-upload) its useUpload hook reads the interrupted session from
      localStorage and surfaces the "Continue upload?" resume prompt — which the
      on-demand upload modal could never do, since it isn't mounted on load.
    */}
    <UploadZone />
    </>
  )
}
