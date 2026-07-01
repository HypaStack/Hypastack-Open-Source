"use client"

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "motion/react"
import { useAuth } from "@/hooks/useAuth"
import { ManageProvider, useManage } from "@/hooks/useManage"
import { MIcon } from "@/components/ui/material-icon"
import { PreferencesModal, type PreferencesTab } from "@/components/preferences-modal"
import { TierAnnouncementModal } from "@/components/tier-announcement-modal"
import { HypaNotifProvider } from "@/components/ui/hypa-notif"
import { useTheme } from "@/hooks/useTheme"
import { PageLogo } from "@/components/page-logo"
import { UploadZone } from "@/components/upload"
import {
  type NavItem,
  SECTION_BUTTONS,
  DRIVE_SUBNAV,
  CDN_SUBNAV,
  DUMPSTER_SUBNAV,
  SECTION_ORDER,
  SIDEBAR_WIDTH,
  STORAGE_KEY_DONATION_NOTICE,
} from "@/constants"
import { getTierLimits, normalizeTier } from "@/constants/tier-limits"

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

function getSubNav(pathname: string): NavItem[] {
  if (pathname.startsWith("/manage/files")) return DRIVE_SUBNAV
  if (pathname.startsWith("/manage/cdn")) return CDN_SUBNAV
  if (pathname.startsWith("/manage/dumpster")) return DUMPSTER_SUBNAV
  return DRIVE_SUBNAV
}

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
      className={`group relative flex items-center gap-3 rounded-md text-sm font-medium transition-colors duration-150 cursor-pointer ${
        active
          ? 'bg-[#f4f4f4] dark:bg-[rgba(255,255,255,0.08)] text-[#171717] dark:text-[#f7f8f8]'
          : 'text-[#666] dark:text-[#898e97] hover:bg-[#f4f4f4] dark:hover:bg-[rgba(255,255,255,0.04)] hover:text-[#171717] dark:hover:text-[#f7f8f8]'
      }`}
      style={{
        height: 32,
        paddingLeft: 12,
        paddingRight: 12,
      }}
    >
      <MIcon 
        name={item.icon} 
        size={18} 
        className={`shrink-0 transition-colors ${active ? 'text-[#171717] dark:text-[#f7f8f8]' : 'text-[#666] dark:text-[#898e97] group-hover:text-[#171717] dark:group-hover:text-[#f7f8f8]'}`} 
      />
      <div className="overflow-hidden whitespace-nowrap flex items-center justify-between flex-1">
        <span className="truncate">{item.label}</span>
        {badge && <div className="ml-2 shrink-0">{badge}</div>}
      </div>
    </Link>
  )
}

function SidebarNavContent({ section, pathname }: { section: string, pathname: string }) {
  // Use a fallback path if the section doesn't match the pathname to ensure we get the right nav items
  const items = section === "CDN" ? CDN_SUBNAV : section === "Dumpster" ? DUMPSTER_SUBNAV : DRIVE_SUBNAV

  return (
    <>
      <div className="flex items-center pt-5 pb-3 shrink-0" style={{ paddingLeft: 24 }}>
        <span className="text-[18px] font-medium tracking-tight text-black dark:text-[#e3e3e3]">
          {section}
        </span>
      </div>

      <nav
        className="flex-1 min-h-0 pt-1 pb-2 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ padding: '0.25rem 0.75rem' }}
      >
        <div className="space-y-0.5">
          {items.map((item) => (
            <NavRow
              key={item.href}
              item={item}
              active={pathname === item.href}
            />
          ))}
        </div>
      </nav>
    </>
  )
}

// SECTION_ORDER imported from @/constants

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%"
  }),
  center: {
    x: 0
  },
  exit: (direction: number) => ({
    x: direction < 0 ? "100%" : "-100%",
    position: 'absolute' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    pointerEvents: 'none' as const,
  })
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

  const currentSection = sectionTitle(pathname)
  
  const prevSectionRef = useRef(currentSection)
  const directionRef = useRef(1)

  if (prevSectionRef.current !== currentSection) {
    const prevIndex = SECTION_ORDER[prevSectionRef.current] ?? 0
    const newIndex = SECTION_ORDER[currentSection] ?? 0
    directionRef.current = newIndex > prevIndex ? 1 : -1
    prevSectionRef.current = currentSection
  }

  const direction = directionRef.current

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

  if (isLoading || !isAuthenticated || !user) {
    return null
  }

  const initials = (user.nickname || "?").charAt(0).toUpperCase()
  const usedPct = stats?.storagePercent ?? 0

  // Sidebar usage indicators for shared file links and CDN assets, against the
  // user's tier caps. Bar goes gray → yellow (past halfway) → red (at the cap).
  const tierLimits = getTierLimits(normalizeTier(user.tier))
  const sharedUsed = files?.length ?? 0
  const cdnUsed = stats?.cdnAssets ?? cdnAssets?.length ?? 0
  const sharedPct = tierLimits.maxFileLinks > 0 ? (sharedUsed / tierLimits.maxFileLinks) * 100 : 0
  const cdnPct = tierLimits.maxCdnLinks > 0 ? (cdnUsed / tierLimits.maxCdnLinks) * 100 : 0
  const usageBarColor = (pct: number) =>
    pct >= 100 ? "bg-red-500" : pct >= 50 ? "bg-yellow-500" : "bg-gray-400 dark:bg-gray-500"

  return (
    <>
    <div className={`flex h-screen w-full overflow-hidden bg-[#f0f0f0] dark:bg-[#08090a] text-[#171717] dark:text-[#e3e3e3]${resolvedTheme === 'dark' ? ' theme-dark' : ''}`}>
      <aside className="hidden lg:flex w-16 shrink-0 flex-col items-center pt-6 pb-2">
        <Link href="/" aria-label="Hypastack home" className="shrink-0 transition-transform duration-300">
          <PageLogo size={32} borderRadius={8} darkSrc="https://r2.hypastack.com/cdn/7byi0fl52s1c/favicon.webp" />
        </Link>

        <div className="flex flex-col items-center gap-2 mt-8 flex-1">
          {SECTION_BUTTONS.map((item) => {
            const active = isSectionActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center justify-center h-12 w-12 rounded-[14px] transition-colors shrink-0 ${
                  active ? 'bg-white dark:bg-[rgba(255,255,255,0.08)] text-[#171717] dark:text-[#f7f8f8]' : 'text-[#666] dark:text-[#898e97] hover:bg-white dark:hover:bg-[rgba(255,255,255,0.04)] hover:text-[#171717] dark:hover:text-[#f7f8f8]'
                }`}
                aria-label={item.label}
              >
                <MIcon name={item.icon} size={20} />
              </Link>
            )
          })}
        </div>

        <div ref={menuRef} className="relative mb-2">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={`relative flex items-center justify-center h-12 w-12 rounded-[14px] hover:bg-white dark:hover:bg-[rgba(255,255,255,0.04)] transition-colors shrink-0 cursor-pointer ${menuOpen ? 'bg-white dark:bg-[rgba(255,255,255,0.08)]' : ''}`}
            aria-label="Account menu"
          >
            <div className="h-7 w-7">
              <img
                src={user.avatarUrl ? `/api/v2/avatar` : 'https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp'}
                alt={user.nickname}
                className="h-7 w-7 object-cover rounded-full select-none pointer-events-none"
                style={{ borderRadius: '50%' }}
                draggable={false}
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp' }}
              />
            </div>
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                key="account-popover"
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
                className="fixed z-[100] bg-white dark:bg-[#0a0b0c] rounded-[12px] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] py-2"
                style={{ 
                  bottom: '68px', 
                  left: '8px', 
                  width: 240,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                }}
              >
                <div className="px-3 pb-2">
                  <p className="text-sm font-semibold text-[#171717] dark:text-[#e3e3e3]">{user.nickname}</p>
                  <p className="text-xs text-[#666] dark:text-[#888] mt-0.5">{user.id}</p>
                </div>
                
                <div className="mx-3 border-b border-[#f0f0f0] dark:border-[#2c2c2c] mb-1" />
                
                <div className="px-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); openPreferences("account"); }}
                    className="group w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium text-[#333] dark:text-[#ccc] hover:bg-[#f4f4f4] dark:hover:bg-[rgba(255,255,255,0.06)] hover:text-[#171717] dark:hover:text-[#f7f8f8] transition-colors cursor-pointer"
                  >
                    <MIcon name="person" size={18} className="text-[#666] dark:text-[#888] group-hover:text-[#171717] dark:hover:text-[#f7f8f8] transition-colors" />
                    <span>Account settings</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); openPreferences("general"); }}
                    className="group w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium text-[#333] dark:text-[#ccc] hover:bg-[#f4f4f4] dark:hover:bg-[rgba(255,255,255,0.06)] hover:text-[#171717] dark:hover:text-[#f7f8f8] transition-colors cursor-pointer"
                  >
                    <MIcon name="settings" size={18} className="text-[#666] dark:text-[#888] group-hover:text-[#171717] dark:hover:text-[#f7f8f8] transition-colors" />
                    <span>Workspace settings</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); }}
                    className="group w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium text-[#333] dark:text-[#ccc] hover:bg-[#f4f4f4] dark:hover:bg-[rgba(255,255,255,0.06)] hover:text-[#171717] dark:hover:text-[#f7f8f8] transition-colors cursor-pointer"
                  >
                    <MIcon name="card_giftcard" size={18} className="text-[#666] dark:text-[#888] group-hover:text-[#171717] dark:hover:text-[#f7f8f8] transition-colors" />
                    <span>Refer and earn</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); logout(); }}
                    className="group w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium text-[#333] dark:text-[#ccc] hover:bg-[#f4f4f4] dark:hover:bg-[rgba(255,255,255,0.06)] hover:text-[#171717] dark:hover:text-[#f7f8f8] transition-colors cursor-pointer"
                  >
                    <MIcon name="logout" size={18} className="text-[#666] dark:text-[#888] group-hover:text-[#171717] dark:hover:text-[#f7f8f8] transition-colors" />
                    <span>Log out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      <aside
        className="hidden lg:flex shrink-0 flex-col sticky top-0 h-[calc(100vh-16px)] my-2 ml-0 mr-1 rounded-[12px] bg-white dark:bg-[#0a0b0c] overflow-hidden relative"
        style={{ width: SIDEBAR_WIDTH, border: 'none', boxShadow: 'none' }}
      >
        <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden w-full">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentSection}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.65, ease: [0.32, 0.72, 0, 1] }}
              style={{ willChange: 'transform', width: '100%', height: '100%' }}
              className="flex flex-col bg-white dark:bg-[#0a0b0c]"
            >
              <SidebarNavContent
                section={currentSection}
                pathname={pathname}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="px-3 pb-4 pt-3 shrink-0 border-t border-[#ebebeb] dark:border-[#2a2a2a]">
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
              <div className="h-[3px] rounded-full bg-[#ebebeb] dark:bg-[#2a2a2a] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#171717] dark:bg-[#f7f8f8]"
                  style={{ width: `${usedPct}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <div className="flex items-center gap-2 text-[#333] dark:text-[#ccc]">
                  <MIcon name="link" size={15} className="text-[#666] dark:text-[#888]" />
                  <span>Shared Links</span>
                </div>
                <span className="text-[#666] dark:text-[#888]">{sharedUsed}/{tierLimits.maxFileLinks}</span>
              </div>
              <div className="h-[3px] rounded-full bg-[#ebebeb] dark:bg-[#2a2a2a] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${usageBarColor(sharedPct)}`}
                  style={{ width: `${Math.min(100, sharedPct)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <div className="flex items-center gap-2 text-[#333] dark:text-[#ccc]">
                  <MIcon name="cloud" size={15} className="text-[#666] dark:text-[#888]" />
                  <span>CDN Assets</span>
                </div>
                <span className="text-[#666] dark:text-[#888]">{cdnUsed}/{tierLimits.maxCdnLinks}</span>
              </div>
              <div className="h-[3px] rounded-full bg-[#ebebeb] dark:bg-[#2a2a2a] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${usageBarColor(cdnPct)}`}
                  style={{ width: `${Math.min(100, cdnPct)}%` }}
                />
              </div>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => openPreferences("plans")}
            className="relative w-full inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150 mt-4"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)] group-hover:to-[rgba(255,255,255,0.25)] transition-colors duration-300" />
            <div className="relative bg-[#151616] rounded-full w-full h-[40px] flex items-center justify-center text-[#f7f8f8] text-[14px] font-medium">
              Upgrade plan
            </div>
          </button>
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
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-x-0 bottom-0 z-[39] flex flex-col safe-area-bottom lg:hidden pointer-events-auto"
            style={{
              height: '90vh',
              backgroundColor: resolvedTheme === 'dark' ? '#0a0b0c' : '#f5f5f5',
              borderRadius: '18px 18px 0 0',
              willChange: 'transform',
            }}
          >
              <div className="flex justify-center pt-3 pb-2">
                <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#d4d4d8' }} />
              </div>

              <div className="px-3 pb-3 pt-1">
                <div className="flex bg-[#e5e5e5] dark:bg-[#111111] rounded-md p-1 gap-1">
                  {SECTION_BUTTONS.map((section) => {
                    const active = isSectionActive(pathname, section.href)
                    return (
                      <Link
                        key={section.href}
                        href={section.href}
                        onClick={() => setDrawerOpen(false)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[14px] font-semibold transition-all ${
                          active
                            ? "bg-white dark:bg-[#2a2a2a] text-[#171717] dark:text-[#e3e3e3] shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
                            : "text-[#666] dark:text-[#888] active:bg-[rgba(0,0,0,0.05)] dark:active:bg-[#222]"
                        }`}
                      >
                        <MIcon name={section.icon} size={16} />
                        {section.label}
                      </Link>
                    )
                  })}
                </div>
              </div>

              <div style={{ height: 1, margin: '0 12px 12px', backgroundColor: resolvedTheme === 'dark' ? '#2a2a2a' : 'rgba(0,0,0,0.06)' }} />

              <div className="flex flex-col gap-1.5 flex-1" style={{ padding: '0 12px 16px' }}>
                {getSubNav(pathname).map((item) => {
                  const active = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-4 w-full active:scale-[0.98] transition-all duration-75 ${
                        active
                          ? "bg-white dark:bg-[#2a2a2a] text-[#171717] dark:text-[#e3e3e3]"
                          : "text-[#666] dark:text-[#888] active:bg-white dark:active:bg-[#2a2a2a]"
                      }`}
                      style={{ height: 42, paddingLeft: 16, paddingRight: 16, borderRadius: 6 }}
                    >
                      <MIcon name={item.icon} size={20} style={{ color: active ? (resolvedTheme === 'dark' ? '#e3e3e3' : '#171717') : (resolvedTheme === 'dark' ? '#888' : '#666') }} />
                      <span style={{ fontSize: 15, fontWeight: 500 }}>{item.label}</span>
                    </Link>
                  )
                })}
              </div>

              <div style={{ height: 1, margin: '4px 12px', backgroundColor: 'rgba(0,0,0,0.06)' }} />
              <div className="flex items-center gap-3" style={{ padding: '16px 16px 60px' }}>
                <div className="relative overflow-hidden shrink-0" style={{ width: 40, height: 40, borderRadius: 6 }}>
                  <img
                    src={user.avatarUrl ? `/api/v2/avatar` : 'https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp'}
                    alt={user.nickname}
                    className="w-full h-full object-cover select-none pointer-events-none"
                    draggable={false}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp' }}
                  />
                </div>
                <span className="text-[15px] font-medium text-[#171717] dark:text-[#e3e3e3] truncate flex-1">{user.nickname}</span>
                <button
                  type="button"
                  onClick={() => openPreferences("general")}
                  className="flex items-center justify-center hover:bg-white dark:hover:bg-[#2a2a2a] active:scale-[0.95] transition-all duration-75"
                  style={{ width: 40, height: 40, borderRadius: 6 }}
                  aria-label="Settings"
                >
                  <MIcon name="settings" size={18} style={{ color: '#666' }} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false)
                    logout()
                  }}
                  className="flex items-center justify-center hover:bg-[rgba(239,68,68,0.1)] active:scale-[0.95] transition-all duration-75"
                  style={{ height: 40, paddingLeft: 12, paddingRight: 12, borderRadius: 6, fontSize: 14, fontWeight: 500, color: '#ef4444' }}
                >
                  Sign out
                </button>
              </div>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 min-w-0 flex-col h-[calc(100vh-16px)] my-2 ml-1 mr-2 rounded-[12px] bg-white dark:bg-[#0a0b0c] overflow-hidden relative" style={{ border: 'none', boxShadow: 'none' }}>
        <header
          className="flex shrink-0 items-center gap-2 px-3 pt-1.5 pb-1.5 bg-white dark:bg-[#0a0b0c] lg:hidden safe-area-top relative z-10"
          style={{ borderBottom: resolvedTheme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f0f0f0' }}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center text-[#333] dark:text-[#ccc] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] active:scale-[0.95] transition-all duration-75"
            style={{ width: 40, height: 40, borderRadius: '50%', marginLeft: -4 }}
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="10" x2="20" y2="10"></line>
              <line x1="4" y1="15" x2="20" y2="15"></line>
            </svg>
          </button>
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

    {menuOpen && (
      <div className="fixed inset-0 z-[99]" onClick={() => setMenuOpen(false)} />
    )}

    <AnimatePresence>
      {showDonationNotice && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
          className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full bg-white dark:bg-[#0a0b0c]"
          style={{ borderRadius: 6, padding: 20, boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.08)' }}
        >
          <div className="flex flex-col">
            <h3 className="text-[15px] font-semibold text-[#171717] dark:text-[#e3e3e3] mb-2 leading-tight">A quick note</h3>
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
              <button
                onClick={() => {
                  setShowDonationNotice(false)
                  localStorage.setItem(STORAGE_KEY_DONATION_NOTICE, "true")
                }}
                className="inline-flex items-center justify-center bg-[#f5f5f5] dark:bg-[#2a2a2a] hover:bg-[#eaeaea] dark:hover:bg-[#333] text-[#171717] dark:text-[#e3e3e3] font-medium transition-colors active:scale-[0.97]"
                style={{ height: 34, paddingLeft: 16, paddingRight: 16, borderRadius: 6, fontSize: 13 }}
              >
                Hide notification
              </button>
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
