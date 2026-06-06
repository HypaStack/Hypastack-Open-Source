"use client"

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react"

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "motion/react"
import { useAuth } from "@/hooks/useAuth"
import { MIcon } from "@/components/ui/material-icon"
import { PreferencesModal, type PreferencesTab } from "@/components/preferences-modal"
import { TierAnnouncementModal } from "@/components/tier-announcement-modal"
import { HypaNotifProvider } from "@/components/ui/hypa-notif"

import { useTheme } from "@/hooks/useTheme"
import { PageLogo } from "@/components/page-logo"

interface NavItem {
  label: string
  href: string
  icon: string
}

const SECTION_BUTTONS: NavItem[] = [
  { label: "Drive", href: "/manage/files", icon: "hard_drive" },
  { label: "CDN", href: "/manage/cdn", icon: "cloud" },
]

const DRIVE_SUBNAV: NavItem[] = [
  { label: "Files", href: "/manage/files", icon: "folder" },
  { label: "Analytics", href: "/manage/files/analytics", icon: "bar_chart" },
  { label: "Recent", href: "/manage/files/recent", icon: "schedule" },
]

const CDN_SUBNAV: NavItem[] = [
  { label: "Assets", href: "/manage/cdn", icon: "cloud" },
  { label: "Analytics", href: "/manage/cdn/analytics", icon: "bar_chart" },
]

function getSubNav(pathname: string): NavItem[] {
  if (pathname.startsWith("/manage/files")) return DRIVE_SUBNAV
  if (pathname.startsWith("/manage/cdn")) return CDN_SUBNAV
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

function sectionTitle(pathname: string): string {
  if (pathname.startsWith("/manage/files")) return "Drive"
  if (pathname.startsWith("/manage/cdn")) return "CDN"
  if (pathname.startsWith("/manage/canary")) return "Canary"
  return "Drive"
}

const SIDEBAR_WIDTH = 232

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
      className={`group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer ${
        active
          ? 'bg-[#007AFF]/10 text-[#007AFF]'
          : 'text-[#666] hover:bg-[#eaeaea] hover:text-[#171717]'
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
        className={`shrink-0 transition-colors ${active ? 'text-[#007AFF]' : 'text-[#666] group-hover:text-[#171717]'}`} 
      />
      <div className="overflow-hidden whitespace-nowrap flex items-center justify-between flex-1">
        <span className="truncate">{item.label}</span>
        {badge && <div className="ml-2 shrink-0">{badge}</div>}
      </div>
    </Link>
  )
}

function SidebarNavContent({ section, pathname, isInsider }: { section: string, pathname: string, isInsider: boolean }) {
  // Use a fallback path if the section doesn't match the pathname to ensure we get the right nav items
  const items = section === "CDN" ? CDN_SUBNAV : section === "Canary" ? [] : DRIVE_SUBNAV

  return (
    <>
      <div className="flex items-center pt-5 pb-3 shrink-0" style={{ paddingLeft: 24 }}>
        <span className="text-[18px] font-medium tracking-tight text-black">
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

          {isInsider && section === "Drive" && (
            <NavRow
              item={{ label: "Insider Program", href: "/manage/canary", icon: "science" }}
              active={pathname === "/manage/canary"}
              badge={<span style={{ fontSize: 9, fontWeight: 700, backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308', padding: '2px 5px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>v2.7.3</span>}
            />
          )}
        </div>
      </nav>
    </>
  )
}

const SECTION_ORDER: Record<string, number> = {
  "Drive": 0,
  "CDN": 1,
  "Canary": 2
}

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
    top: 0, left: 0, right: 0, bottom: 0
  })
}

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, stats, isAuthenticated, isLoading, logout } = useAuth()
  const { resolvedTheme } = useTheme()

  const currentSection = sectionTitle(pathname)
  const [tuple, setTuple] = useState<[number, string]>([1, currentSection])
  
  if (tuple[1] !== currentSection) {
    const prevIndex = SECTION_ORDER[tuple[1]] ?? 0
    const newIndex = SECTION_ORDER[currentSection] ?? 0
    setTuple([newIndex > prevIndex ? 1 : -1, currentSection])
  }
  
  const direction = tuple[0]

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
    if (localStorage.getItem("hypastack_donation_notice_hidden") !== "true") {
      setShowDonationNotice(true)
    }
  }, [])

  if (isLoading || !isAuthenticated || !user) {
    return null
  }

  const initials = (user.nickname || "?").charAt(0).toUpperCase()
  const usedPct = stats?.storagePercent ?? 0

  return (
    <>
    <div className="flex h-screen w-full overflow-hidden bg-[#f0f0f0] text-[#171717]">
      <aside className="hidden lg:flex w-16 shrink-0 flex-col items-center pt-6 pb-2">
        <Link href="/" aria-label="Hypastack home" className="shrink-0 transition-transform duration-300">
          <PageLogo size={32} borderRadius={8} disableLayoutAnimation={true} />
        </Link>

        <div className="flex flex-col items-center gap-2 mt-8 flex-1">
          {SECTION_BUTTONS.map((item) => {
            const active = isSectionActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center justify-center h-12 w-12 rounded-lg transition-colors shrink-0 ${
                  active ? 'bg-white text-[#171717]' : 'text-[#666] hover:bg-white hover:text-[#171717]'
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
            className={`relative flex items-center justify-center h-12 w-12 rounded-lg hover:bg-white transition-colors shrink-0 cursor-pointer ${menuOpen ? 'bg-white' : ''}`}
            aria-label="Account menu"
          >
            <div className="h-7 w-7">
              {user.avatarUrl ? (
                <img
                  src={`/api/v2/avatar?t=${user.avatarUrl}`}
                  alt={user.nickname}
                  className="h-7 w-7 object-cover rounded-full select-none pointer-events-none"
                  style={{ borderRadius: '50%' }}
                  draggable={false}
                />
              ) : (
                <div className="h-7 w-7 flex items-center justify-center bg-[#ccc] text-white text-[11px] font-bold rounded-full">
                  {initials}
                </div>
              )}
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
                className="fixed z-[100] bg-white rounded-lg border border-[#e5e5e5] py-2"
                style={{ 
                  bottom: '68px', 
                  left: '8px', 
                  width: 240,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                }}
              >
                <div className="px-3 pb-2">
                  <p className="text-sm font-semibold text-[#171717]">{user.nickname}</p>
                  <p className="text-xs text-[#666] mt-0.5">{user.id}</p>
                </div>
                
                <div className="mx-3 border-b border-[#f0f0f0] mb-1" />
                
                <div className="px-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); openPreferences("account"); }}
                    className="group w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium text-[#333] hover:bg-[#007AFF]/10 hover:text-[#007AFF] transition-colors cursor-pointer"
                  >
                    <MIcon name="person" size={18} className="text-[#666] group-hover:text-[#007AFF] transition-colors" />
                    <span>Account settings</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); openPreferences("general"); }}
                    className="group w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium text-[#333] hover:bg-[#007AFF]/10 hover:text-[#007AFF] transition-colors cursor-pointer"
                  >
                    <MIcon name="settings" size={18} className="text-[#666] group-hover:text-[#007AFF] transition-colors" />
                    <span>Workspace settings</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); }}
                    className="group w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium text-[#333] hover:bg-[#007AFF]/10 hover:text-[#007AFF] transition-colors cursor-pointer"
                  >
                    <MIcon name="card_giftcard" size={18} className="text-[#666] group-hover:text-[#007AFF] transition-colors" />
                    <span>Refer and earn</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); logout(); }}
                    className="group w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium text-[#333] hover:bg-[#007AFF]/10 hover:text-[#007AFF] transition-colors cursor-pointer"
                  >
                    <MIcon name="logout" size={18} className="text-[#666] group-hover:text-[#007AFF] transition-colors" />
                    <span>Log out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      <aside
        className="hidden lg:flex shrink-0 flex-col sticky top-0 h-[calc(100vh-16px)] my-2 ml-0 mr-1 rounded-[10px] bg-white overflow-hidden relative"
        style={{ width: SIDEBAR_WIDTH, borderRight: 'none', boxShadow: '0 0 0 1px rgba(0,0,0,0.06)' }}
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
              className="flex flex-col bg-white"
            >
              <SidebarNavContent 
                section={currentSection} 
                pathname={pathname} 
                isInsider={user?.is_insider === 1} 
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="px-3 pb-4 pt-3 shrink-0 border-t border-[#ebebeb]">
          <div className="text-xs text-[#666] font-medium mb-3">
            Usage
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <div className="flex items-center gap-2 text-[#333]">
                  <MIcon name="bolt" size={15} className="text-[#666]" />
                  <span>Credits</span>
                </div>
                <span className="text-[#666]">{user.creditsBalance ?? 0}</span>
              </div>
              <div className="h-[3px] rounded-full bg-[#ebebeb] overflow-hidden">
                <div 
                  className="h-full rounded-full bg-[#007AFF]" 
                  style={{ width: `${Math.min(((user.creditsBalance ?? 0) / 1000) * 100, 100)}%` }} 
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <div className="flex items-center gap-2 text-[#333]">
                  <MIcon name="hard_drive" size={15} className="text-[#666]" />
                  <span>Storage</span>
                </div>
                <span className="text-[#666]">{usedPct}%</span>
              </div>
              <div className="h-[3px] rounded-full bg-[#ebebeb] overflow-hidden">
                <div 
                  className="h-full rounded-full bg-[#007AFF]" 
                  style={{ width: `${usedPct}%` }} 
                />
              </div>
            </div>
          </div>
          
          <button
            type="button"
            className="w-full h-9 bg-black text-white text-sm font-medium rounded-lg hover:bg-[#333] transition-colors cursor-pointer mt-4"
          >
            Upgrade plan
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
              backgroundColor: '#f5f5f5',
              borderRadius: '18px 18px 0 0',
              willChange: 'transform',
            }}
          >
              <div className="flex justify-center pt-3 pb-2">
                <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#d4d4d8' }} />
              </div>

              <div className="flex flex-col gap-1.5 flex-1" style={{ padding: '8px 12px 16px' }}>
                {getSubNav(pathname).map((item) => {
                  const active = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-4 w-full active:scale-[0.98] transition-all duration-75 ${
                        active
                          ? "bg-white text-[#171717]"
                          : "text-[#666] active:bg-white"
                      }`}
                      style={{ height: 42, paddingLeft: 16, paddingRight: 16, borderRadius: 10 }}
                    >
                      <MIcon name={item.icon} size={20} style={{ color: active ? '#171717' : '#666' }} />
                      <span style={{ fontSize: 15, fontWeight: 500 }}>{item.label}</span>
                    </Link>
                  )
                })}

                {user?.is_insider === 1 && (
                  <Link
                    href="/manage/canary"
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-4 w-full active:scale-[0.98] transition-all duration-75 ${
                      pathname === "/manage/canary"
                        ? "bg-white text-[#171717]"
                        : "text-[#666] active:bg-white"
                    }`}
                    style={{ height: 42, paddingLeft: 16, paddingRight: 16, borderRadius: 10 }}
                  >
                    <MIcon name="science" size={20} style={{ color: pathname === "/manage/canary" ? '#171717' : '#666' }} />
                    <span style={{ fontSize: 15, fontWeight: 500, flex: 1, lineHeight: 'normal' }}>Insider Program</span>
                    <span style={{ fontSize: 9, fontWeight: 700, backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308', padding: '2px 5px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>v2.7.3</span>
                  </Link>
                )}
              </div>

              <div style={{ height: 1, margin: '4px 12px', backgroundColor: 'rgba(0,0,0,0.06)' }} />
              <div className="flex items-center gap-3" style={{ padding: '16px 16px 60px' }}>
                <div className="relative overflow-hidden shrink-0" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#e5e5e5' }}>
                  {user.avatarUrl ? (
                    <Image src={`/api/v2/avatar?t=${user.avatarUrl}`} alt={user.nickname} fill sizes="40px" className="object-cover select-none pointer-events-none" draggable={false} unoptimized />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-[#ccc] text-white text-sm font-bold">
                      {initials}
                    </div>
                  )}
                </div>
                <span className="text-[15px] font-medium text-[#171717] truncate flex-1">{user.nickname}</span>
                <button
                  type="button"
                  onClick={() => openPreferences("general")}
                  className="flex items-center justify-center hover:bg-white active:scale-[0.95] transition-all duration-75"
                  style={{ width: 40, height: 40, borderRadius: 12 }}
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
                  style={{ height: 40, paddingLeft: 12, paddingRight: 12, borderRadius: 12, fontSize: 14, fontWeight: 500, color: '#ef4444' }}
                >
                  Sign out
                </button>
              </div>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 min-w-0 flex-col h-[calc(100vh-16px)] my-2 ml-1 mr-2 rounded-[10px] bg-white overflow-hidden relative">
        <header
          className="flex shrink-0 items-center gap-2 px-3 pt-1.5 pb-1.5 bg-white lg:hidden safe-area-top relative z-10"
          style={{ borderBottom: '1px solid #f0f0f0' }}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center text-[#333] hover:bg-[#f5f5f5] active:scale-[0.95] transition-all duration-75"
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
          className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full bg-white"
          style={{ borderRadius: 14, padding: 20, boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.08)' }}
        >
          <div className="flex flex-col">
            <h3 className="text-[15px] font-semibold text-[#171717] mb-2 leading-tight">A quick note</h3>
            <p className="text-[13.5px] text-[#666] leading-relaxed mb-5">
              Please don't reveal photos for no reason and spam it, this will lower costs of keeping this platform alive. If you want, you can support us by clicking Donate.
            </p>
            <div className="flex items-center gap-2.5">
              <a
                href="https://ko-fi.com/hypastack"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center bg-[#facc15] hover:bg-[#eab308] text-black font-semibold transition-colors active:scale-[0.97]"
                style={{ height: 34, paddingLeft: 16, paddingRight: 16, borderRadius: 12, fontSize: 13 }}
              >
                Donate
              </a>
              <button
                onClick={() => {
                  setShowDonationNotice(false)
                  localStorage.setItem("hypastack_donation_notice_hidden", "true")
                }}
                className="inline-flex items-center justify-center bg-[#f5f5f5] hover:bg-[#eaeaea] text-[#171717] font-medium transition-colors active:scale-[0.97]"
                style={{ height: 34, paddingLeft: 16, paddingRight: 16, borderRadius: 12, fontSize: 13 }}
              >
                Hide notification
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}
