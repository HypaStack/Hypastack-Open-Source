"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Script from "next/script"
import Turnstile from "react-turnstile"
import { MIcon } from "@/components/ui/material-icon"
import { isTauri } from "@/lib/tauri"
import { PageLogo } from "@/components/page-logo"
import { useAuth } from "@/hooks/useAuth"
import { deriveMasterKey, storeSessionKey, extractUserIdFromAccessKey } from "@/lib/crypto-client"

export default function SignInPage() {
  const router = useRouter()
  const [showKey, setShowKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [accessKey, setAccessKey] = useState("")
  const [turnstileToken, setTurnstileToken] = useState(process.env.NODE_ENV === "development" ? "dev-bypass" : "")
  const [isDesktop, setIsDesktop] = useState(false)
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  useEffect(() => { setIsDesktop(isTauri()) }, [])
  useEffect(() => {
    if (!authLoading && isAuthenticated) window.location.href = "/manage/files"
  }, [isAuthenticated, authLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    try {
      const csrfRes = await fetch("/api/v2/csrf", { credentials: "include" })
      const csrfData = await csrfRes.json()
      const csrfToken: string = csrfData.token
      const response = await fetch("/api/v2/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKey, turnstileToken, csrfToken }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to sign in")
      const userId = extractUserIdFromAccessKey(accessKey)
      if (!userId) throw new Error("Invalid access key format")
      const masterKey = await deriveMasterKey(accessKey, userId)
      await storeSessionKey(masterKey)
      const params = new URLSearchParams(window.location.search)
      const redirect = params.get("redirect")
      const allowedRedirects = new Set(["/manage/files"])
      window.location.href = redirect && allowedRedirects.has(redirect) ? redirect : "/manage/files"
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  return (
    <>
      {process.env.NODE_ENV !== "development" && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="beforeInteractive" />
      )}
      <div className="flex min-h-screen bg-[#ffffff]">
        <div className="relative flex flex-1 flex-col items-center lg:items-start lg:pl-[12%] xl:pl-[16%] justify-center px-8 py-12">
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.13) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          />
          <div className="relative z-10 w-full max-w-[360px]">
            <div className="mb-9">
              <PageLogo size={44} borderRadius={10} pulse={isLoading} />
            </div>
            <h1
              className="text-[28px] font-semibold tracking-tight text-[#111] mb-1"
              style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
            >
              Sign in
            </h1>
            <p className="text-[14px] text-[#555] mb-8">Enter your access key to continue.</p>
            {error && (
              <div className="flex items-start gap-2 text-[13px] text-[#c0392b] bg-[#fff5f5] border border-[#ffd7d5] p-3 rounded-[8px] mb-5">
                <MIcon name="error" size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {!isLoading ? (
              <form onSubmit={handleSubmit} className="space-y-3">
                <label className="block text-[12px] font-medium text-[#333] mb-1.5">Access key</label>
                <div
                  className="flex items-center border border-[rgba(0,0,0,0.15)] bg-white focus-within:border-[#111] transition-colors"
                  style={{ borderRadius: 6 }}
                >
                  <span className="pl-3 text-[#888]"><MIcon name="key" size={15} /></span>
                  <input
                    type={showKey ? "text" : "password"}
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    placeholder="hpsk_..."
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    required
                    className="flex-1 bg-transparent pl-2.5 pr-2 py-2.5 text-[14px] text-[#111] placeholder:text-[#888] focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="pr-3 text-[#888] hover:text-[#333] transition-colors"
                    aria-label={showKey ? "Hide" : "Show"}
                  >
                    {showKey ? <MIcon name="visibility_off" size={17} /> : <MIcon name="visibility" size={17} />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!accessKey || (!turnstileToken && process.env.NODE_ENV !== "development")}
                  className="w-full bg-[#111] text-white text-[14px] font-semibold hover:bg-[#2a2a2a] active:scale-[0.99] transition-all duration-75 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ borderRadius: 6, height: 40 }}
                >
                  Sign in
                </button>
                {process.env.NODE_ENV !== "development" && (
                  <div className="flex justify-center pt-1">
                    <Turnstile
                      sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                      onVerify={(t) => setTurnstileToken(t)}
                      onExpire={() => setTurnstileToken("")}
                    />
                  </div>
                )}
              </form>
            ) : (
              <div className="flex items-center gap-2 text-[14px] text-[#888] py-4">
                <MIcon name="progress_activity" size={16} className="animate-spin" />
                Signing in…
              </div>
            )}
            {!isDesktop && (
              <p className="mt-6 text-[12px] text-[#666] leading-relaxed">
                Lost your key? Access keys can&apos;t be recovered — this is by design for your privacy.
              </p>
            )}
            <p className="mt-8 text-[13px] text-[#666]">
              No account?{" "}
              <Link href="/new" className="text-[#111] font-semibold hover:underline">
                Create one
              </Link>
            </p>
          </div>
          {!isDesktop && (
            <div className="absolute bottom-6 left-8 flex gap-5 text-[12px] text-[#ccc]">
              <Link href="/terms" className="hover:text-[#888] transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-[#888] transition-colors">Privacy</Link>
              <Link href="/help" className="hover:text-[#888] transition-colors">Help</Link>
            </div>
          )}
        </div>
        {!isDesktop && (
          <div
            className="hidden lg:flex w-[440px] xl:w-[540px] shrink-0 flex-col justify-center items-start p-10 xl:p-14 bg-[#f4f4f5]"
          >
            <div className="w-full">
              <img 
                src="https://r2.hypastack.com/cdn/8pnp1fg9kk1f/dashboard.png" 
                alt="Behind the scenes" 
                className="w-full h-auto mb-6 object-cover" 
                style={{ borderRadius: 6 }} 
              />
              <h2 className="text-[18px] font-semibold text-[#111] mb-5 leading-snug text-left" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>
                Look how Hypastack looks behind the scenes
              </h2>
              <a
                href="https://github.com/HypaStack/Hypastack-Open-Source"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-[#e5e5e5] text-[#111] text-[13px] font-medium px-4 py-1.5 hover:bg-[#d5d5d5] active:scale-[0.98] transition-all"
                style={{ borderRadius: 6 }}
              >
                Take a look
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
