"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { isTauri } from "@/lib/tauri"

/**
 * Rate limit config.
 * If the user refreshes more than MAX_REFRESHES within WINDOW_MS,
 * they get locked out for COOLDOWN_MS.
 */
const MAX_REFRESHES = 3
const WINDOW_MS = 8_000      // 8-second sliding window
const COOLDOWN_MS = 30_000   // 30-second lockout

/**
 * DesktopGuard — Tauri-only security layer.
 *
 * 1. Blocks all devtools shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U)
 * 2. Blocks Ctrl+R, Ctrl+Shift+R (refresh shortcuts)
 * 3. Rate-limits F5 — triggers inescapable fullscreen lockout on abuse
 * 4. Blocks right-click context menu
 *
 * On the web, this component renders nothing.
 */
export function DesktopGuard() {
  const [rateLimited, setRateLimited] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [isDesktop, setIsDesktop] = useState(false)
  const refreshTimestamps = useRef<number[]>([])
  const lockoutEnd = useRef<number>(0)

  useEffect(() => {
    setIsDesktop(isTauri())
  }, [])

  // Countdown timer during lockout
  useEffect(() => {
    if (!rateLimited) return
    const interval = setInterval(() => {
      const remaining = Math.max(0, lockoutEnd.current - Date.now())
      if (remaining <= 0) {
        setRateLimited(false)
        setCountdown(0)
        refreshTimestamps.current = []
      } else {
        setCountdown(Math.ceil(remaining / 1000))
      }
    }, 200)
    return () => clearInterval(interval)
  }, [rateLimited])

  const triggerRateLimit = useCallback(() => {
    lockoutEnd.current = Date.now() + COOLDOWN_MS
    setCountdown(Math.ceil(COOLDOWN_MS / 1000))
    setRateLimited(true)
  }, [])

  // Master keyboard handler — capture phase, highest priority
  useEffect(() => {
    if (!isDesktop) return

    const handler = (e: KeyboardEvent) => {
      // ─── DURING RATE LIMIT: block EVERYTHING ───
      if (rateLimited) {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        return
      }

      const key = e.key.toLowerCase()
      const ctrl = e.ctrlKey || e.metaKey
      const shift = e.shiftKey

      // ─── Block devtools shortcuts ───
      // F12
      if (e.key === "F12") {
        e.preventDefault()
        e.stopImmediatePropagation()
        return
      }
      // Ctrl+Shift+I (Inspector)
      if (ctrl && shift && key === "i") {
        e.preventDefault()
        e.stopImmediatePropagation()
        return
      }
      // Ctrl+Shift+J (Console)
      if (ctrl && shift && key === "j") {
        e.preventDefault()
        e.stopImmediatePropagation()
        return
      }
      // Ctrl+Shift+C (Element picker)
      if (ctrl && shift && key === "c") {
        e.preventDefault()
        e.stopImmediatePropagation()
        return
      }
      // Ctrl+U (View source)
      if (ctrl && key === "u") {
        e.preventDefault()
        e.stopImmediatePropagation()
        return
      }

      // ─── Block refresh shortcuts (except F5 which is rate-limited) ───
      // Ctrl+R / Ctrl+Shift+R
      if (ctrl && key === "r") {
        e.preventDefault()
        e.stopImmediatePropagation()
        return
      }
      // Ctrl+F5 (hard refresh) — blocked entirely
      if (ctrl && e.key === "F5") {
        e.preventDefault()
        e.stopImmediatePropagation()
        return
      }

      // ─── Rate-limit F5 ───
      if (e.key === "F5" && !ctrl && !shift) {
        const now = Date.now()
        // Prune old timestamps outside the window
        refreshTimestamps.current = refreshTimestamps.current.filter(
          (t) => now - t < WINDOW_MS
        )
        refreshTimestamps.current.push(now)

        if (refreshTimestamps.current.length > MAX_REFRESHES) {
          e.preventDefault()
          e.stopImmediatePropagation()
          triggerRateLimit()
          return
        }
        // Allow the F5 through (browser default: reload)
      }
    }

    // Use capture phase to intercept before anything else
    document.addEventListener("keydown", handler, { capture: true })
    return () => document.removeEventListener("keydown", handler, { capture: true })
  }, [isDesktop, rateLimited, triggerRateLimit])

  // Block right-click context menu
  useEffect(() => {
    if (!isDesktop) return
    const handler = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }
    document.addEventListener("contextmenu", handler, { capture: true })
    return () => document.removeEventListener("contextmenu", handler, { capture: true })
  }, [isDesktop])

  // Block beforeunload during rate limit (prevents navigation tricks)
  useEffect(() => {
    if (!isDesktop || !rateLimited) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDesktop, rateLimited])

  if (!isDesktop || !rateLimited) return null

  // ─── INESCAPABLE RATE LIMIT OVERLAY ───
  const formatTime = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, "0")}`
    }
    return `${seconds}s`
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647, // Max z-index
        backgroundColor: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        cursor: "default",
        // Block pointer events on everything underneath
        pointerEvents: "all",
      }}
      // Block all mouse events from bubbling
      onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      {/* Pulsing shield icon */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(239, 68, 68, 0.1)",
          border: "2px solid rgba(239, 68, 68, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          animation: "rl-pulse 2s ease-in-out infinite",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(239, 68, 68, 0.8)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h1
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: "#e4e4e7",
          margin: 0,
          marginBottom: 8,
          fontFamily: "var(--font-codec-pro), system-ui, sans-serif",
          letterSpacing: "-0.01em",
        }}
      >
        You&apos;ve been rate limited
      </h1>

      <p
        style={{
          fontSize: 14,
          color: "#71717a",
          margin: 0,
          marginBottom: 32,
        }}
      >
        Too many refresh attempts detected.
      </p>

      {/* Countdown */}
      <div
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: "#ef4444",
          fontFamily: "var(--font-jetbrains), monospace",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.05em",
        }}
      >
        {formatTime(countdown)}
      </div>

      <p
        style={{
          fontSize: 12,
          color: "#3f3f46",
          marginTop: 40,
        }}
      >
        This restriction cannot be bypassed.
      </p>

      {/* Pulse animation */}
      <style>{`
        @keyframes rl-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
