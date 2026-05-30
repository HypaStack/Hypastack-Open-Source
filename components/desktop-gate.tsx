"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { isTauri } from "@/lib/tauri"
import { PageLogo } from "./page-logo"

/**
 * Shows a premium loading splash and redirects desktop users
 * past the marketing landing page. On the web, renders nothing.
 */
export function DesktopGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading } = useAuth()
  const [showSplash, setShowSplash] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    if (!isTauri()) return

    if (pathname === "/") {
      setShowSplash(true)
    } else {
      // Navigation completed — tear down the overlay
      setShowSplash(false)
      setFadeOut(false)
    }
  }, [pathname])

  useEffect(() => {
    if (!showSplash || isLoading) return

    // Auth resolved — redirect
    const target = user ? "/manage/dashboard" : "/signin"

    // Brief delay for the splash to feel intentional
    const timer = setTimeout(() => {
      setFadeOut(true)
      setTimeout(() => {
        router.replace(target)
      }, 400)
    }, 800)

    return () => clearTimeout(timer)
  }, [showSplash, isLoading, user, router])

  if (showSplash) {
    return (
      <div
        className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-400 ${
          fadeOut ? "opacity-0" : "opacity-100"
        }`}
        style={{ background: "#0a0a0a" }}
      >
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="relative">
            <PageLogo size={72} borderRadius={16} className="relative drop-shadow-2xl" />
          </div>

          {/* App name */}
          <h1
            className="text-xl font-medium tracking-wide"
            style={{ color: "#e4e4e7", fontFamily: "var(--font-codec-pro), system-ui, sans-serif" }}
          >
            Hypastack
          </h1>

          {/* Loading spinner */}
          <div className="flex items-center gap-2 mt-2">
            <div className="relative h-5 w-5">
              <div
                className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
                style={{
                  borderTopColor: "#b0b0b0",
                  borderRightColor: "rgba(95, 157, 255, 0.3)",
                  animationDuration: "0.8s",
                }}
              />
            </div>
            <span className="text-xs" style={{ color: "#71717a" }}>
              {isLoading ? "Authenticating…" : "Loading workspace…"}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
