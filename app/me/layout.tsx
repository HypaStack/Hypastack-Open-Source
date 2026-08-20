"use client"

import { useEffect, useLayoutEffect, useState, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import { useAuth } from "@/hooks/useAuth"
import { ManageProvider, useManage } from "@/hooks/useManage"
import { MIcon } from "@/components/ui/material-icon"
import { Button, Chip, Dropdown, Modal, Switch, TextField, TextArea, Label, ProgressBar, toast, typographyVariants } from "@heroui/react"
import { Tooltip } from "@/components/ui/tooltip"
import { PreferencesModal, type PreferencesTab } from "@/components/preferences-modal"
import { TierAnnouncementModal } from "@/components/tier-announcement-modal"
import { useTheme } from "@/hooks/useTheme"
import { UploadZone } from "@/components/upload"
import { ManageSkeleton, SKELETON_DELAY_MS, SKELETON_FADE_MS } from "./_skeleton"
import { AccountSwitcher } from "./_account-switcher"
import {
  type NavItem,
  SECTION_BUTTONS,
  ADMIN_NAV_ITEM,
  SIDEBAR_WIDTH,
  API_BASE,
} from "@/constants"
import { getTierLimits, normalizeTier, type Tier } from "@/constants/tier-limits"

const TIER_CHIP_COLOR: Record<Tier, "default" | "accent" | "warning" | "danger"> = {
  free: "default",
  plus: "accent",
  pro: "warning",
  max: "danger",
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

// Shared content width so the account trigger and its popover render pixel-identical.
const SIDEBAR_CONTENT_WIDTH = SIDEBAR_WIDTH

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
  if (pathname.startsWith("/me/storage")) return "Storage"
  if (pathname.startsWith("/me/requests")) return "Requests"
  if (pathname.startsWith("/me/hosting")) return "Hosting"
  if (pathname.startsWith("/me/paste")) return "Paste"
  return "Storage"
}


function DockButton({ collapsed, onPress }: { collapsed: boolean; onPress: () => void }) {
  return (
    <Button
      variant="outline"
      isIconOnly
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      onPress={onPress}
      className="border-white/10 shrink-0"
      style={{ height: 38, width: 38 }}
    >
      <MIcon name="dock_to_right" size={18} className="text-muted" />
    </Button>
  )
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
    <Tooltip content={item.hint} placement="right">
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group relative flex items-center gap-2 rounded-3xl text-[15px] font-medium transition-colors duration-150 cursor-pointer ${
        active
          ? "bg-[#1f1f1f] text-[#ededed]"
          : "text-[#a0a0a0] hover:bg-[#1f1f1f] hover:text-[#ededed]"
      }`}
      style={{
        height: 35,
        paddingLeft: 12,
        paddingRight: 12,
      }}
    >
      {/* size as a string skips MIcon's +2px nudge, a hair over the 15px label. */}
      <MIcon
        name={item.icon}
        size="16px"
        style={{ fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' -25, 'opsz' 48" }}
        className="shrink-0"
      />
      <div className="overflow-hidden whitespace-nowrap flex items-center justify-between flex-1">
        <span className="truncate">{item.label}</span>
        {badge && <div className="ml-2 shrink-0">{badge}</div>}
      </div>
    </Link>
    </Tooltip>
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
  const { user, stats, isLoading, logout } = useManage()
  const { resolvedTheme } = useTheme()

  const [shouldRedirect, setShouldRedirect] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [delayPassed, setDelayPassed] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [preferencesTab, setPreferencesTab] = useState<PreferencesTab>("account")
  const [copiedId, setCopiedId] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackLinkAccount, setFeedbackLinkAccount] = useState(true)
  const [feedbackText, setFeedbackText] = useState("")

  const openPreferences = useCallback((tab: PreferencesTab) => {
    setPreferencesTab(tab)
    setPreferencesOpen(true)
    setDrawerOpen(false)
  }, [])

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
    document.title = `${sectionTitle(pathname)} | Hypastack`
  }, [pathname])

  useEffect(() => {
    if (pathname === "/me" || pathname === "/me/") {
      router.replace("/me/storage")
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

  // Only a load slow enough to notice earns a skeleton. delayPassed staying true
  // afterwards is fine, showSkeleton is gated on isLoading anyway.
  useEffect(() => {
    if (!isLoading) return
    const timer = setTimeout(() => setDelayPassed(true), SKELETON_DELAY_MS)
    return () => clearTimeout(timer)
  }, [isLoading])

  const showSkeleton = isLoading && delayPassed

  if (!isLoading && (!isAuthenticated || !user)) {
    return null
  }

  const tier = normalizeTier(user?.tier)
  const tierLimits = getTierLimits(tier)
  const tierChipColor = TIER_CHIP_COLOR[tier]
  const sectionItems = user?.isOwner ? [...SECTION_BUTTONS, ADMIN_NAV_ITEM] : SECTION_BUTTONS
  return (
    <>
    {/* Sits over the real dashboard so it can fade off it, rather than blinking out. */}
    <AnimatePresence>
      {showSkeleton && (
        <motion.div
          key="dashboard-skeleton"
          className="fixed inset-0 z-[60]"
          exit={{ opacity: 0 }}
          transition={{ duration: SKELETON_FADE_MS, ease: "easeOut" }}
        >
          <ManageSkeleton pathname={pathname} />
        </motion.div>
      )}
    </AnimatePresence>

    {user && (
    <div className={`flex h-screen w-full overflow-hidden bg-[#f0f0f0] dark:bg-black text-[#171717] dark:text-[#e3e3e3]${resolvedTheme === 'dark' ? ' theme-dark' : ''}`}>
      <aside
        className={`${sidebarCollapsed ? "hidden" : "hidden lg:flex"} shrink-0 flex-col sticky top-0 z-10 h-[calc(100vh-16px)] my-2 ml-2 mr-1`}
        style={{ width: SIDEBAR_WIDTH }}
      >
        <div className="relative z-20 shrink-0 flex items-center gap-2 px-0 pt-2" style={{ width: SIDEBAR_CONTENT_WIDTH }}>
          <AccountSwitcher userId={user.id} nickname={user.nickname} hasAvatar={Boolean(user.avatarUrl)} />

          <DockButton collapsed={false} onPress={() => setSidebarCollapsed(true)} />
        </div>

        <nav className="flex-1 min-h-0 px-0 pt-4 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="space-y-1">
            {sectionItems.map((item) => (
              <NavRow
                key={item.href}
                item={item}
                active={isSectionActive(pathname, item.href)}
              />
            ))}
          </div>
        </nav>

        <div className="px-0 pt-3 shrink-0">
          <div className="mb-0.5 flex items-center justify-between text-[12px]">
            <Label className="font-medium text-foreground">Storage</Label>
            <span className="text-[14px] font-medium text-foreground">{(stats?.storagePercent ?? 0).toFixed(1)}%</span>
          </div>
          <ProgressBar value={stats?.storagePercent ?? 0} aria-label="Storage used">
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
        </div>

        <div className="relative z-20 shrink-0 px-0 pt-3 pb-2">
          <Dropdown>
            <Dropdown.Trigger
              aria-label="Account menu"
              className="flex items-center gap-2.5 rounded-3xl transition-colors duration-150 cursor-pointer bg-background border border-white/10 text-foreground hover:bg-white/5 data-[pressed=true]:!transform-none active:!transform-none"
              style={{ width: SIDEBAR_CONTENT_WIDTH, height: 38, paddingLeft: 8, paddingRight: 8, fontSize: 14 }}
            >
              <img decoding="async"
                src={user.avatarUrl ? `${API_BASE}/avatar` : 'https://r2.hypastack.com/cdn/hypadefaultprofilepicture/default-pfp.jpg'}
                alt={user.nickname}
                className="shrink-0 object-cover rounded-full select-none pointer-events-none"
                style={{ width: "1.3em", height: "1.3em" }}
                draggable={false}
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://r2.hypastack.com/cdn/hypadefaultprofilepicture/default-pfp.jpg' }}
              />
              <span className="min-w-0 flex-1 truncate text-left font-medium">{user.nickname}</span>
              <MIcon name="expand_all" size={10} className="shrink-0 text-muted" />
            </Dropdown.Trigger>

            {/* containerPadding matches the sidebar's 8px margin, not react-aria's default 12px. */}
            <Dropdown.Popover
              placement="top"
              containerPadding={8}
              offset={8}
              className="p-0 overflow-hidden bg-background border border-white/10"
              style={{ width: SIDEBAR_CONTENT_WIDTH }}
            >
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    decoding="async"
                    src={user.avatarUrl ? `${API_BASE}/avatar` : 'https://r2.hypastack.com/cdn/hypadefaultprofilepicture/default-pfp.jpg'}
                    alt={user.nickname}
                    className="h-5 w-5 shrink-0 rounded-full object-cover select-none pointer-events-none"
                    draggable={false}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://r2.hypastack.com/cdn/hypadefaultprofilepicture/default-pfp.jpg' }}
                  />
                  <p className="min-w-0 truncate text-[16px] font-semibold leading-tight text-foreground">{user.nickname}</p>
                  <Chip size="sm" color={tierChipColor} className="shrink-0 text-[11px]">
                    <MIcon name="check_circle" size={12} />
                    {tierLimits.label}
                  </Chip>
                  {/* Manually sized to match Chip sm, no Button size is that small. */}
                  <Button variant="danger-soft" size="sm" onPress={logout} className="ml-auto shrink-0 h-5 px-2 text-xs md:h-5 rounded-2xl">
                    Sign out
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard?.writeText(user.id); setCopiedId(true); setTimeout(() => setCopiedId(false), 1500) }}
                  className="mt-1.5 flex items-center gap-1 max-w-full text-[12px] text-muted hover:text-foreground transition-colors"
                >
                  <span className="truncate">{user.id}</span>
                  <MIcon name={copiedId ? "check" : "content_copy"} size={12} className="shrink-0" />
                </button>
              </div>

              <div className="h-px bg-white/10" />

              <Dropdown.Menu aria-label="Account actions" className="p-1.5">
                <Dropdown.Item id="account" onAction={() => openPreferences("account")} textValue="Account settings">
                  Account settings
                </Dropdown.Item>
                <Dropdown.Item id="feedback" onAction={() => setFeedbackOpen(true)} textValue="Feedback">
                  Feedback
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>

        <div className="px-0 pb-3 shrink-0">
          <Button
            variant="outline"
            onPress={() => openPreferences("plans")}
            size="md"
            fullWidth
            className="relative border-transparent"
          >
            {/* Masked gradient ring, plain border-color can't fade top-to-bottom. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[inherit]"
              style={{
                padding: 1,
                background: "linear-gradient(to top, oklch(0.6204 0.195 253.83) 0%, rgba(255,255,255,0.1) 50%)",
                WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
              }}
            />
            Upgrade plan
          </Button>
        </div>
      </aside>

      {/* nothing to separate once the sidebar is docked away */}
      <div className={`${sidebarCollapsed ? "hidden" : "hidden lg:block"} shrink-0 w-px my-4 ml-1 bg-white/10`} />

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
              backgroundColor: resolvedTheme === 'dark' ? '#121212' : '#ffffff',
              borderRadius: '20px 20px 0 0',
              borderTop: resolvedTheme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid #ebebeb',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.22)',
              willChange: 'transform',
            }}
          >
              {/* Grab handle, the sheet drags from here (or any empty space) to dismiss. */}
              <div className="flex justify-center pt-3 pb-2.5 cursor-grab active:cursor-grabbing">
                <div style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: resolvedTheme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />
              </div>

              <div className="flex flex-col gap-1 px-3 py-2">
                {sectionItems.map((item) => (
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
                  src={user.avatarUrl ? `${API_BASE}/avatar` : 'https://r2.hypastack.com/cdn/hypadefaultprofilepicture/default-pfp.jpg'}
                  alt={user.nickname}
                  className="h-10 w-10 shrink-0 rounded-full object-cover select-none pointer-events-none"
                  draggable={false}
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://r2.hypastack.com/cdn/hypadefaultprofilepicture/default-pfp.jpg' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-[#171717] dark:text-[#f7f8f8]">{user.nickname}</p>
                  <p className="text-[12px] text-[#888] dark:text-[#898e97]">{tierLimits.label} plan</p>
                </div>
                <Button
                  variant="ghost"
                  isIconOnly
                  onPress={() => { setDrawerOpen(false); openPreferences("account") }}
                  aria-label="Settings"
                  style={{ width: 40, height: 40 }}
                >
                  <MIcon name="settings" size={18} />
                </Button>
                <Button
                  variant="danger-soft"
                  onPress={() => { setDrawerOpen(false); logout() }}
                  style={{ height: 40, fontSize: 14, paddingLeft: 12, paddingRight: 12 }}
                >
                  Sign out
                </Button>
              </div>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 min-w-0 flex-col h-[calc(100vh-16px)] my-2 ml-1 mr-2 rounded-[18px] bg-white dark:bg-transparent shadow-none overflow-hidden relative">
        {/* Docked: sidebar claims no width, top-2 lines this up with its top row. */}
        {sidebarCollapsed && (
          <div className="hidden lg:block absolute left-6 top-2 z-20">
            <DockButton collapsed onPress={() => setSidebarCollapsed(false)} />
          </div>
        )}

        <header
          className="flex shrink-0 items-center gap-2 px-3 pt-1.5 pb-1.5 bg-white dark:bg-black lg:hidden safe-area-top relative z-10"
          style={{ borderBottom: resolvedTheme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f0f0f0' }}
        >
          <Button
            variant="ghost"
            isIconOnly
            onPress={() => setDrawerOpen(true)}
            aria-label="Open menu"
            style={{ width: 40, height: 40, borderRadius: '50%', marginLeft: -4 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6"></line>
              <line x1="4" y1="12" x2="20" y2="12"></line>
              <line x1="4" y1="18" x2="20" y2="18"></line>
            </svg>
          </Button>
        </header>

        <div className="flex-1 relative overflow-hidden">
          {/* Indent lives here, not on main, a second padding utility there would lose. */}
          <div className={`absolute inset-0 overflow-y-auto ${sidebarCollapsed ? "lg:pl-[50px]" : ""}`}>
            <motion.main
              key={pathname}
              initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="h-full flex flex-col px-3 sm:px-5 lg:px-6 pt-2 pb-6"
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

      <Modal isOpen={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <Modal.Backdrop isDismissable variant="blur">
          <Modal.Container placement="center" size="md">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading className={typographyVariants({ type: "h5" }).base()}>Send feedback</Modal.Heading>
                <Modal.CloseTrigger />
              </Modal.Header>
              <Modal.Body className="space-y-4">
                <TextField value={feedbackText} onChange={setFeedbackText} className="w-full">
                  <Label>What's on your mind?</Label>
                  <TextArea rows={4} className="resize-none" placeholder="Tell us what's working, what's not..." />
                </TextField>
                <Switch isSelected={feedbackLinkAccount} onChange={setFeedbackLinkAccount}>
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    <span>Link my account to this feedback</span>
                  </Switch.Content>
                </Switch>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={() => setFeedbackOpen(false)}>Cancel</Button>
                <Button
                  variant="primary"
                  isDisabled={!feedbackText.trim()}
                  onPress={() => {
                    setFeedbackOpen(false)
                    setFeedbackText("")
                    setFeedbackLinkAccount(true)
                    toast.success("Feedback sent", { description: "Thanks, we read every one of these." })
                  }}
                >
                  Submit
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

    </div>
    )}

    {/* Always mounted so a fresh load can still detect an interrupted upload. */}
    <UploadZone />
    </>
  )
}
