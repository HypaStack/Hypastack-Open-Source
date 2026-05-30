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

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/manage", icon: "home" },
  { label: "Canvas", href: "/manage/canvas", icon: "widgets" },
  { label: "Drive", href: "/manage/files", icon: "hard_drive" },
  { label: "CDN Assets", href: "/manage/cdn", icon: "cloud" },
]

function formatStorageSize(bytes: number): string {
  if (!bytes || !isFinite(bytes) || bytes <= 0) return "0B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i]
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/manage") return pathname === "/manage"
  if (href === "/manage/dashboard") return pathname === "/manage/dashboard"
  return pathname === href || pathname.startsWith(href + "/")
}

function sectionTitle(pathname: string): string {
  if (pathname === "/manage") return "Home"
  if (pathname.startsWith("/manage/files")) return "Drive"
  if (pathname.startsWith("/manage/cdn")) return "CDN Assets"
  if (pathname.startsWith("/manage/canvas")) return "Canvas"
  if (pathname.startsWith("/manage/canary")) return "Canary"
  return "Home"
}

const SIDEBAR_MIN = 56
const SIDEBAR_MAX = 300
const SIDEBAR_DEFAULT = 56
const SIDEBAR_EXPANDED = 260
const SIDEBAR_SNAP_THRESHOLD = 140 // below this → snap to collapsed

function NavRow({
  item,
  active,
  onNavigate,
  sidebarWidth,
  badge,
}: {
  item: NavItem
  active: boolean
  onNavigate?: () => void
  sidebarWidth: number
  badge?: React.ReactNode
}) {
  const Icon = item.icon
  const collapsed = sidebarWidth < SIDEBAR_SNAP_THRESHOLD
  // Text fades in between 100-160px
  const textOpacity = Math.max(0, Math.min(1, (sidebarWidth - 100) / 60))
  const textWidth = collapsed ? 0 : Math.max(0, sidebarWidth - 80)
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={`group relative flex items-center leading-normal transition-colors duration-150 ${
        collapsed ? 'justify-center' : ''
      } ${
        active
          ? 'bg-[#313131] text-white font-medium'
          : 'bg-transparent text-[#a1a1aa] hover:bg-[#313131] hover:text-white font-medium'
      }`}
      style={{
        height: collapsed ? 40 : 34,
        width: collapsed ? 40 : 'auto',
        paddingLeft: collapsed ? 0 : 12,
        paddingRight: collapsed ? 0 : 12,
        borderRadius: collapsed ? 20 : 16,
        fontSize: 14,
      }}
    >
      <MIcon name={item.icon} size={collapsed ? 18 : 15} className="shrink-0" style={{ color: active ? '#ffffff' : 'rgba(255,255,255,0.6)' }} />
      <div
        className="overflow-hidden whitespace-nowrap flex items-center justify-between"
        style={{
          width: `${textWidth}px`,
          marginLeft: collapsed ? '0px' : '12px',
          opacity: textOpacity,
        }}
      >
        <span className="truncate" style={{ color: active ? '#ffffff' : '#e3e3e3' }}>{item.label}</span>
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
  const router = useRouter()
  const pathname = usePathname()
  const { user, stats, isAuthenticated, isLoading, logout } = useAuth()
  const { resolvedTheme } = useTheme()

  const [shouldRedirect, setShouldRedirect] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [preferencesTab, setPreferencesTab] = useState<PreferencesTab>("general")
  const [copiedId, setCopiedId] = useState(false)

  // Sidebar width (px) — persisted
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT)
  const [isDragging, setIsDragging] = useState(false)
  const [sidebarReady, setSidebarReady] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [showDonationNotice, setShowDonationNotice] = useState(false)
  const dragStartX = useRef(0)
  const dragStartW = useRef(0)

  // Restore width before first paint
  useIsomorphicLayoutEffect(() => {
    const saved = localStorage.getItem("sidebar-width")
    if (saved) {
      const w = parseInt(saved, 10)
      if (w >= SIDEBAR_MIN && w <= SIDEBAR_MAX) setSidebarWidth(w)
      else if (w < SIDEBAR_MIN) setSidebarWidth(SIDEBAR_MIN)
    }
    if (localStorage.getItem("hypastack_sidebar_tooltip") !== "true") {
      setShowTooltip(true)
    }
    if (localStorage.getItem("hypastack_donation_notice_hidden") !== "true") {
      setShowDonationNotice(true)
    }
    // Mark ready after first paint to enable snap transitions
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setSidebarReady(true))
    })
  }, [])

  const dismissTooltip = useCallback(() => {
    if (showTooltip) {
      setShowTooltip(false)
      localStorage.setItem("hypastack_sidebar_tooltip", "true")
    }
  }, [showTooltip])

  // Drag handlers
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartX.current = e.clientX
    dragStartW.current = sidebarWidth
  }, [sidebarWidth])

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStartX.current
      const newW = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, dragStartW.current + delta))
      setSidebarWidth(newW)
    }
    const onUp = () => {
      setIsDragging(false)
      // Snap to nearest detent
      setSidebarWidth(prev => {
        const target = prev < SIDEBAR_SNAP_THRESHOLD ? SIDEBAR_MIN : SIDEBAR_EXPANDED
        if (target === SIDEBAR_EXPANDED) {
          dismissTooltip()
        }
        localStorage.setItem("sidebar-width", String(target))
        return target
      })
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    // Prevent text selection while dragging
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isDragging, dismissTooltip])

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


  if (isLoading || !isAuthenticated || !user) {
    return null
  }

  const initials = (user.nickname || "?").charAt(0).toUpperCase()
  const usedPct = stats?.storagePercent ?? 0

  return (
    <>
    <div
      className={`theme-dark theme-dashboard theme-${resolvedTheme} flex h-screen w-full overflow-hidden bg-[#0f0f0f] text-foreground`}
      data-theme={resolvedTheme}
    >
      {/* ── Sidebar ── */}
      <aside
        className="hidden lg:flex shrink-0 flex-col sticky top-0 h-full relative overflow-hidden"
        style={{
          width: `${sidebarWidth}px`,
          backgroundColor: 'transparent',
          transition: isDragging ? 'none' : (sidebarReady ? 'width 300ms cubic-bezier(0.4,0,0.2,1), background-color 300ms ease' : 'none'),
        }}
      >
        {/* Brand row — logo always visible */}
        <div
          className={`flex items-center pt-3.5 pb-2.5 ${sidebarWidth < SIDEBAR_SNAP_THRESHOLD ? 'justify-center' : ''}`}
          style={{
            paddingLeft: sidebarWidth < SIDEBAR_SNAP_THRESHOLD ? '0px' : '24px',
            transition: isDragging ? 'none' : (sidebarReady ? 'padding 300ms cubic-bezier(0.4,0,0.2,1)' : 'none')
          }}
        >
          <Link href="/" aria-label="Hypastack home" className="shrink-0 transition-transform duration-300">
            <PageLogo
              size={sidebarWidth < SIDEBAR_SNAP_THRESHOLD ? 32 : 42}
              borderRadius={sidebarWidth < SIDEBAR_SNAP_THRESHOLD ? 8 : 10}
              disableLayoutAnimation={true}
            />
          </Link>
        </div>

        {/* Nav */}
        <nav
          className="flex-1 min-h-0 pt-1 pb-2 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ padding: `0.25rem ${sidebarWidth < SIDEBAR_SNAP_THRESHOLD ? '0.25rem' : '0.75rem'}` }}
        >
          <div className={`space-y-0.5 ${sidebarWidth < SIDEBAR_SNAP_THRESHOLD ? 'flex flex-col items-center' : ''}`}>
            {NAV_ITEMS.map((item) => (
              <NavRow
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
                sidebarWidth={sidebarWidth}
              />
            ))}

            {/* Insider Program — right after CDN Assets */}
            {user?.is_insider === 1 && (
              <NavRow
                item={{ label: "Insider Program", href: "/manage/canary", icon: "science" }}
                active={isActive(pathname, "/manage/canary")}
                sidebarWidth={sidebarWidth}
                badge={<span style={{ fontSize: 9, fontWeight: 700, backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308', padding: '2px 5px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>v2.7.3</span>}
              />
            )}
          </div>
        </nav>

        {/* Sidebar avatar + popover */}
        <div 
          className={`relative pb-3 pt-1 flex ${sidebarWidth < SIDEBAR_SNAP_THRESHOLD ? 'justify-center' : ''}`} 
          style={{ paddingLeft: sidebarWidth < SIDEBAR_SNAP_THRESHOLD ? 0 : 12, paddingRight: sidebarWidth < SIDEBAR_SNAP_THRESHOLD ? 0 : 12 }}
          ref={menuRef}
        >
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="relative h-10 w-10 overflow-hidden rounded-full bg-[#1f1f1f] hover:opacity-90 transition-all shrink-0"
            style={{
              marginLeft: sidebarWidth < SIDEBAR_SNAP_THRESHOLD ? '0px' : '4px',
            }}
            aria-label="Account menu"
          >
            {user.avatarUrl ? (
              <Image
                src={`/api/v2/avatar?t=${user.avatarUrl}`}
                alt={user.nickname}
                fill
                sizes="40px"
                className="object-cover select-none pointer-events-none"
                draggable={false}
                unoptimized
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-[#9b9b9b] text-white text-sm font-bold">
                {initials}
              </div>
            )}
          </button>

        </div>

      </aside>

      {/* Drag handle — only active in the vertical middle of the screen */}
      <div
        onMouseDown={onDragStart}
        className="hidden lg:flex fixed z-50 cursor-col-resize w-[24px] group items-center justify-center -ml-[12px]"
        style={{
          left: `${sidebarWidth + 12}px`,
          top: '25%',
          bottom: '25%',
          transition: isDragging ? 'none' : (sidebarReady ? 'left 300ms cubic-bezier(0.4,0,0.2,1)' : 'none')
        }}
      >
        <div className={`w-[5px] rounded-full transition-all duration-300 ease-out ${
          isDragging 
            ? 'bg-[#666] h-14 opacity-100' 
            : 'bg-[#3a3a3f] h-8 opacity-100 group-hover:h-10 group-hover:bg-[#555]'
        }`} />

        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, x: -10, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.3 }}
              className="absolute left-[20px] top-1/2 -translate-y-1/2 bg-[#1f1f1f] border border-[#2a2a2a] shadow-xl whitespace-normal w-[220px] pointer-events-none"
              style={{ padding: '10px 14px', borderRadius: 12 }}
            >
              <div className="absolute left-[-5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#1f1f1f] border-l border-b border-[#2a2a2a] rotate-45" />
              <p className="text-[13px] text-[#e3e3e3] font-medium leading-tight relative z-10">Hover near the sidebar to change state to collapsed/uncollapsed</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mobile bottom sheet ── */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[38] lg:hidden"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
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
              backgroundColor: '#171717',
              borderRadius: '24px 24px 0 0',
              willChange: 'transform',
            }}
          >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#3a3a3e' }} />
              </div>

              {/* Nav */}
              <div className="flex flex-col gap-1.5 flex-1" style={{ padding: '8px 12px 16px' }}>
                {NAV_ITEMS.map((item) => {
                  const active = isActive(pathname, item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-4 w-full active:scale-[0.98] transition-all duration-75 ${
                        active
                          ? "bg-[#1f1f1f] text-white"
                          : "text-[#aaa] active:bg-[#1f1f1f]"
                      }`}
                      style={{ height: 42, paddingLeft: 16, paddingRight: 16, borderRadius: 14 }}
                    >
                      <MIcon name={item.icon} size={20} style={{ color: active ? '#fff' : '#b4b4b8' }} />
                      <span style={{ fontSize: 15, fontWeight: 500 }}>{item.label}</span>
                    </Link>
                  )
                })}

                {user?.is_insider === 1 && (
                  <Link
                    href="/manage/canary"
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-4 w-full active:scale-[0.98] transition-all duration-75 ${
                      isActive(pathname, "/manage/canary")
                        ? "bg-[#1f1f1f] text-white"
                        : "text-[#aaa] active:bg-[#1f1f1f]"
                    }`}
                    style={{ height: 42, paddingLeft: 16, paddingRight: 16, borderRadius: 14 }}
                  >
                    <MIcon name="science" size={20} style={{ color: isActive(pathname, "/manage/canary") ? '#fff' : '#b4b4b8' }} />
                    <span style={{ fontSize: 15, fontWeight: 500, flex: 1, lineHeight: 'normal' }}>Insider Program</span>
                    <span style={{ fontSize: 9, fontWeight: 700, backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308', padding: '2px 5px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>v2.7.3</span>
                  </Link>
                )}
              </div>

              {/* Divider + user row */}
              <div style={{ height: 1, margin: '4px 12px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
              <div className="flex items-center gap-3" style={{ padding: '16px 16px 60px' }}>
                <div className="relative overflow-hidden shrink-0" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#1f1f1f' }}>
                  {user.avatarUrl ? (
                    <Image src={`/api/v2/avatar?t=${user.avatarUrl}`} alt={user.nickname} fill sizes="40px" className="object-cover select-none pointer-events-none" draggable={false} unoptimized />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-[#9b9b9b] text-white text-sm font-bold">
                      {initials}
                    </div>
                  )}
                </div>
                <span className="text-[15px] font-medium text-white truncate flex-1">{user.nickname}</span>
                <button
                  type="button"
                  onClick={() => openPreferences("general")}
                  className="flex items-center justify-center hover:bg-[#1f1f1f] active:scale-[0.95] transition-all duration-75"
                  style={{ width: 40, height: 40, borderRadius: 12 }}
                  aria-label="Settings"
                >
                  <MIcon name="settings" size={18} style={{ color: '#b4b4b8' }} />
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

      {/* ── Main column ── */}
      <div className="flex flex-1 min-w-0 flex-col h-full overflow-hidden relative">
        {/* Mobile-only top bar */}
        <header
          className="flex shrink-0 items-center gap-2 px-3 pt-1.5 pb-1.5 bg-[#1a1a1a] lg:hidden safe-area-top relative z-10"
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center text-[#e2e2e8] hover:bg-[#2a2a2a] active:scale-[0.95] transition-all duration-75"
            style={{ width: 40, height: 40, borderRadius: '50%', marginLeft: -4 }}
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="10" x2="20" y2="10"></line>
              <line x1="4" y1="15" x2="20" y2="15"></line>
            </svg>
          </button>
        </header>

        {/* Page content */}
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

      {/* Preferences modal */}
      <PreferencesModal
        open={preferencesOpen}
        initialTab={preferencesTab}
        onClose={() => setPreferencesOpen(false)}
        user={user}
        storage={stats}
      />

      {/* Fires once whenever the DB tier outpaces last_acknowledged_tier */}
      <TierAnnouncementModal />
      <HypaNotifProvider />

    </div>

    {/* Account popover — Google-style */}
    <AnimatePresence>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-[99]" onClick={() => setMenuOpen(false)} />
          <motion.div
            key="account-popover"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            className="fixed w-[400px] z-[100]"
            style={{ bottom: '20px', left: `${sidebarWidth + 40}px`, transformOrigin: "bottom left", backgroundColor: '#111111', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}
            ref={menuRef}
          >
            <div className="w-full h-full flex flex-col">


            {/* Centered avatar + greeting */}
            <div className="flex flex-col items-center px-5 pt-8 pb-4">
              <div className="relative h-[88px] w-[88px] overflow-hidden rounded-full bg-[#222] mb-4">
                {user.avatarUrl ? (
                  <Image src={`/api/v2/avatar?t=${user.avatarUrl}`} alt={user.nickname} fill sizes="88px" className="object-cover select-none pointer-events-none" draggable={false} unoptimized />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-[#9b9b9b] text-white text-3xl font-bold">
                    {initials}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-1.5 px-4 mb-2 w-full">
                <p className="truncate max-w-[calc(100%-24px)]" style={{ fontSize: 24, fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em' }}>
                  {user.nickname}
                </p>
                {user.is_insider === 1 && (
                  <MIcon name="verified" size={24} style={{ color: '#eab308' }} className="shrink-0" />
                )}
              </div>
              <div className="flex items-center justify-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(user.id)
                    setCopiedId(true)
                    setTimeout(() => setCopiedId(false), 2000)
                  }}
                  className="flex items-center gap-1.5 hover:text-white transition-colors active:scale-[0.97]"
                  style={{ fontSize: 13, fontWeight: 500, color: copiedId ? '#4ade80' : '#a1a1aa' }}
                >
                  <MIcon name={copiedId ? "check" : "content_copy"} size={14} /> 
                  {copiedId ? "Copied!" : "Copy user ID"}
                </button>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2, borderRadius: 6, backgroundColor: '#2a2a2e', color: '#ffffff', textTransform: 'uppercase' }}>
                  {user.premium ? (user.tier ?? "essential") : "free"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => openPreferences("account")}
                className="hover:bg-[#1a1a1a] hover:text-white active:scale-[0.97] transition-all duration-75"
                style={{ paddingLeft: 20, paddingRight: 20, height: 34, borderRadius: 14, fontSize: 13, fontWeight: 500, color: '#e3e3e3', backgroundColor: '#1f1f1f' }}
              >
                Manage Account
              </button>
            </div>

            {/* Quick links card */}
            <div style={{ borderRadius: 16, marginBottom: 4, marginLeft: 12, marginRight: 12, backgroundColor: '#171717', overflow: 'hidden' }}>
              <button type="button" onClick={() => { setMenuOpen(false); openPreferences("general") }}
                className="w-full flex items-center gap-3 hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75"
                style={{ height: 36, paddingLeft: 12, paddingRight: 12, borderRadius: 14, fontSize: 14, fontWeight: 400, color: '#e3e3e3' }}>
                <MIcon name="settings" size={15} style={{ color: '#a1a1aa' }} />Settings
              </button>
              <button type="button" onClick={() => { setMenuOpen(false); openPreferences("billing") }}
                className="w-full flex items-center gap-3 hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75"
                style={{ height: 36, paddingLeft: 12, paddingRight: 12, borderRadius: 14, fontSize: 14, fontWeight: 400, color: '#e3e3e3' }}>
                <MIcon name="credit_card" size={15} style={{ color: '#a1a1aa' }} />Billing
              </button>
              <button type="button" onClick={() => { setMenuOpen(false); openPreferences("integrations") }}
                className="w-full flex items-center gap-3 hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75"
                style={{ height: 36, paddingLeft: 12, paddingRight: 12, borderRadius: 14, fontSize: 14, fontWeight: 400, color: '#e3e3e3' }}>
                <MIcon name="power" size={15} style={{ color: '#a1a1aa' }} />Integrations
              </button>
              <button type="button" onClick={() => { setMenuOpen(false); openPreferences("security") }}
                className="w-full flex items-center gap-3 hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75"
                style={{ height: 36, paddingLeft: 12, paddingRight: 12, borderRadius: 14, fontSize: 14, fontWeight: 400, color: '#e3e3e3' }}>
                <MIcon name="shield" size={15} style={{ color: '#a1a1aa' }} />Security
              </button>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-center gap-3 px-5 pb-5 pt-3">
              <button type="button" onClick={() => { setMenuOpen(false); logout() }}
                className="hover:text-[#f76c6c] transition-colors" style={{ fontSize: 12, fontWeight: 500, color: '#e15252' }}>
                Sign out
              </button>
              <span style={{ fontSize: 10, color: '#333' }}>·</span>
              <Link href="/privacy-policy" onClick={() => setMenuOpen(false)}
                className="hover:text-[#999] transition-colors" style={{ fontSize: 12, fontWeight: 500, color: '#a1a1aa' }}>
                Privacy
              </Link>
              <span style={{ fontSize: 10, color: '#333' }}>·</span>
              <Link href="/acceptable-use" onClick={() => setMenuOpen(false)}
                className="hover:text-[#999] transition-colors" style={{ fontSize: 12, fontWeight: 500, color: '#a1a1aa' }}>
                Terms
              </Link>
            </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* Persistent Donation Notification */}
    <AnimatePresence>
      {showDonationNotice && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
          className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full bg-[#171717] shadow-2xl overflow-hidden"
          style={{ borderRadius: 20, padding: 20, boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.4)' }}
        >
          <div className="flex flex-col">
            <h3 className="text-[15px] font-semibold text-white mb-2 leading-tight">A quick note</h3>
            <p className="text-[13.5px] text-[#aaa] leading-relaxed mb-5">
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
                className="inline-flex items-center justify-center bg-[#2a2a2a] hover:bg-[#333] text-white font-medium transition-colors active:scale-[0.97]"
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
