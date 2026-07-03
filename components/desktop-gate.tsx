"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { isTauri } from "@/lib/tauri"
import { PageLogo } from "./page-logo"
import { LoadingSvg } from "@/components/ui/loading-svg"

// shows splash screen

export function DesktopGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading } = useAuth()
  const [showSplash, setShowSplash] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    if (!isTauri()) return

    if (pathname === "/") {
      setShowSplash(true)
    } else {
      // Navigation completed
      setShowSplash(false)
      setFadeOut(false)
    }
  }, [pathname])

  useEffect(() => {
    if (!showSplash || isLoading) return

    // authentication resolved, redirect
    const target = isAuthenticated ? "/manage" : "/signin"

    // brief delay -- will remove soon
    const timer = setTimeout(() => {
      setFadeOut(true)
      setTimeout(() => {
        router.replace(target)
      }, 400)
    }, 800)

    return () => clearTimeout(timer)
  }, [showSplash, isLoading, isAuthenticated, router])

  if (showSplash) {
    return (
      <div
        className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-400 ${
          fadeOut ? "opacity-0" : "opacity-100"
        }`}
        style={{ background: "#0a0a0a" }}
      >
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <PageLogo size={72} borderRadius={16} className="relative drop-shadow-2xl" />
          </div>

          <h1
            className="text-xl font-medium tracking-wide"
            style={{ color: "#e4e4e7", fontFamily: "var(--font-codec-pro), system-ui, sans-serif" }}
          >
            Hypastack
          </h1>

          <div className="flex items-center gap-2 mt-2">
            <LoadingSvg variant="white" size={20} />
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
