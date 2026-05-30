"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { useAuth } from "@/hooks/useAuth"
import Link from "next/link"

const GREETINGS = [
  (name: string) => `Where should we start?`,
  (name: string) => `What's the vibe, ${name}?`,
  (name: string) => `Hi ${name}, what's good?`,
  (name: string) => `What are we working on, ${name}?`,
  (name: string) => `What do you need, ${name}?`,
]

/* ─── Menu items config ─── */
interface MenuItem {
  icon: React.ReactNode
  label: string
  href?: string
  badge?: string
}

const MENU_GROUPS: MenuItem[][] = [
  [
    { icon: <MIcon name="cloud_upload" size={15} />, label: "Upload files", href: "/manage/files" },
    { icon: <MIcon name="hard_drive" size={15} />, label: "Add from CDN", href: "/manage/cdn" },
    { icon: <MIcon name="more_horiz" size={15} />, label: "More uploads" },
  ],
  [
    { icon: <MIcon name="folder_open" size={15} />, label: "Browse files", href: "/manage/files" },
    { icon: <MIcon name="article" size={15} />, label: "File manager", href: "/manage/files" },
  ],
]

export default function ExperiencePage() {
  const { user, isLoading } = useAuth()
  const [query, setQuery] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const nickname = user?.nickname || "friend"

  // Pick a random greeting once on mount
  const greeting = useMemo(
    () => GREETINGS[Math.floor(Math.random() * GREETINGS.length)](nickname),
    [nickname]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    console.log("[Experience] Query:", query)
  }

  // Focus input on mount
  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => inputRef.current?.focus(), 400)
    }
  }, [isLoading])

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [menuOpen])

  // Close menu on Escape
  useEffect(() => {
    if (!menuOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [menuOpen])

  if (isLoading) {
    return (
      <div className="theme-dashboard flex min-h-screen items-center justify-center bg-[#0f0f0f]" />
    )
  }

  return (
    <div className="theme-dashboard relative flex min-h-screen flex-col bg-[#0f0f0f] text-[#e3e3e3]">
      <main className="flex flex-1 flex-col items-center justify-center px-4">

        {/* Greeting */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-8 text-[32px] sm:text-[40px] font-semibold tracking-[-0.02em] text-[#e3e3e3]"
          style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
        >
          {greeting}
        </motion.h1>

        {/* Input pill + menu wrapper */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative w-full max-w-[580px]"
          ref={menuRef}
        >
          {/* Menu popup — positioned above input */}
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
                className="absolute bottom-full left-0 mb-1.5 z-50"
                style={{
                  width: 230,
                  padding: 4,
                  borderRadius: 20,
                  backgroundColor: '#1f1f1f',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 2px 6px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.22)',
                }}
              >
                {MENU_GROUPS.map((group, gi) => (
                  <div key={gi}>
                    {gi > 0 && (
                      <div style={{ height: 1, margin: '2px 6px', backgroundColor: 'rgba(255,255,255,0.07)' }} />
                    )}
                    <div style={{ padding: '2px 0' }}>
                      {group.map((item, ii) => {
                        const content = (
                          <div className="flex items-center w-full" style={{ gap: 12 }}>
                            <span className="shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }}>{item.icon}</span>
                            <span className="flex-1" style={{ fontSize: 14, fontWeight: 400, color: '#e3e3e3', lineHeight: 1 }}>{item.label}</span>
                            {item.badge && (
                              <span className="text-[11px] font-medium bg-[rgba(255,255,255,0.08)] text-[#e3e3e3] px-2 py-0.5 rounded-[6px]">{item.badge}</span>
                            )}
                            {item.label === "More uploads" && (
                              <MIcon name="chevron_right" size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                            )}
                          </div>
                        )

                        if (item.href) {
                          return (
                            <Link
                              key={ii}
                              href={item.href}
                              onClick={() => setMenuOpen(false)}
                              className="flex items-center hover:bg-[#313131] active:bg-[#313131] active:scale-[0.97] transition-all duration-75 cursor-pointer"
                              style={{ height: 34, paddingLeft: 12, paddingRight: 12, borderRadius: 16 }}
                            >
                              {content}
                            </Link>
                          )
                        }

                        return (
                          <button
                            key={ii}
                            type="button"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center w-full hover:bg-[#313131] active:bg-[#313131] active:scale-[0.97] transition-all duration-75 cursor-pointer text-left"
                            style={{ height: 34, paddingLeft: 12, paddingRight: 12, borderRadius: 16, border: 'none', background: 'none' }}
                          >
                            {content}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input pill */}
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 rounded-[32px] bg-[#1e1f20] py-2 pl-2 pr-2">
              {/* + / × toggle button */}
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex shrink-0 items-center justify-center rounded-full bg-transparent hover:bg-[#1f1f1f] active:bg-[#1f1f1f] transition-colors duration-100"
                style={{ width: 32, height: 32 }}
              >
                <motion.div
                  animate={{ rotate: menuOpen ? 45 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="flex items-center justify-center"
                >
                  <MIcon name="add" size={18} style={{ color: 'rgba(255,255,255,0.6)' }} />
                </motion.div>
              </button>

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask Experience"
                className="w-full bg-transparent text-[16px] text-[#e3e3e3] placeholder:text-[#888e93] focus:outline-none font-normal"
                style={{ fontFamily: "'Google Sans', 'DM Sans', sans-serif" }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                id="experience-input"
              />

              {/* Submit button */}
              <button
                type="submit"
                disabled={!query.trim()}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${
                  query.trim()
                    ? "bg-[#e3e3e3] text-[#131314] hover:bg-white"
                    : "text-[rgba(255,255,255,0.28)] cursor-default"
                }`}
              >
                <MIcon name="arrow_upward" size={18} />
              </button>
            </div>
          </form>
        </motion.div>

        {/* Disclaimer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mt-4 text-[12px] text-[rgba(255,255,255,0.38)] font-normal"
        >
          Experience is experimental and may not always be accurate.
        </motion.p>
      </main>
    </div>
  )
}
