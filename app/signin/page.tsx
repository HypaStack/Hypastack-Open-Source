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
import { apiFetch } from "@/lib/fetch"
import { Button } from "@/components/ui/button"
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
      const csrfRes = await apiFetch("/api/v2/csrf", { credentials: "include" })
      const csrfData = await csrfRes.json()
      const csrfToken: string = csrfData.token
      const response = await apiFetch("/api/v2/auth/login", {
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
      <div className="flex min-h-screen bg-[#08090a]">
        <div className="relative flex flex-1 flex-col items-center lg:items-start lg:pl-[12%] xl:pl-[16%] justify-center px-8 py-12">
          <div
            className="absolute inset-0 pointer-events-none opacity-100"
            style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          />
          <div className="relative z-10 w-full max-w-[360px]">
            <div className="mb-9">
              <img 
                src="https://r2.hypastack.com/cdn/lvko6iovrtq7/footer.webp" 
                alt="Hypastack" 
                className={`w-[44px] h-[44px] object-contain ${isLoading ? 'animate-pulse' : ''}`} 
              />
            </div>
            <h1
              className="text-[28px] font-semibold tracking-tight text-[#f7f8f8] mb-1"
              style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
            >
              Sign in
            </h1>
            <p className="text-[14px] text-[#898e97] mb-8">Enter your access key to continue.</p>
            {error && (
              <div className="flex items-start gap-2 text-[13px] text-[#ff6b6b] bg-[rgba(255,107,107,0.08)] border border-[rgba(255,107,107,0.2)] p-3 rounded-[8px] mb-5">
                <MIcon name="error" size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {!isLoading ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#f7f8f8] mb-2 pl-1">Access key</label>
                  <div
                    className="flex items-center border border-[rgba(255,255,255,0.08)] bg-[#0a0b0c] focus-within:border-[rgba(255,255,255,0.2)] transition-colors rounded-full"
                  >
                    <div className="pl-4 flex items-center justify-center text-[#898e97] h-full"><MIcon name="key" size={16} /></div>
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
                      className="flex-1 bg-transparent pl-2.5 pr-2 py-3 text-[14px] text-[#f7f8f8] placeholder:text-[#898e97] focus:outline-none font-mono rounded-full"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="pr-4 flex items-center justify-center text-[#898e97] hover:text-[#f7f8f8] transition-colors outline-none h-full"
                      aria-label={showKey ? "Hide" : "Show"}
                    >
                      {showKey ? <MIcon name="visibility_off" size={18} /> : <MIcon name="visibility" size={18} />}
                    </button>
                  </div>
                </div>
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={!accessKey || (!turnstileToken && process.env.NODE_ENV !== "development")}
                    variant="landing-primary"
                    size="lg"
                    className="w-full"
                  >
                    Sign in
                  </Button>
                </div>
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
              <div className="flex items-center gap-2 text-[14px] text-[#898e97] py-4 pl-1">
                <MIcon name="progress_activity" size={16} className="animate-spin" />
                Signing in…
              </div>
            )}
            {!isDesktop && (
              <p className="mt-6 text-[12px] text-[#898e97] leading-relaxed pl-1">
                If you lost your key, we cannot recover it.
              </p>
            )}
            <p className="mt-8 text-[13px] text-[#898e97] pl-1">
              No account?{" "}
              <Link href="/new" className="text-[#f7f8f8] font-semibold hover:underline">
                Create one
              </Link>
            </p>
          </div>
          {!isDesktop && (
            <div className="absolute bottom-6 left-8 flex gap-5 text-[12px] text-[#898e97]">
              <Link href="/terms" className="hover:text-[#f7f8f8] transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-[#f7f8f8] transition-colors">Privacy</Link>
              <Link href="/help" className="hover:text-[#f7f8f8] transition-colors">Help</Link>
            </div>
          )}
        </div>
        {!isDesktop && (
          <div
            className="hidden lg:flex w-[440px] xl:w-[540px] shrink-0 flex-col justify-center items-start p-10 xl:p-14 bg-[#0a0b0c] border-l border-[rgba(255,255,255,0.05)] relative overflow-hidden"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)] pointer-events-none" />
            <div className="w-full relative z-10">
              <img 
                src="https://r2.hypastack.com/cdn/8pnp1fg9kk1f/dashboard.png" 
                alt="Behind the scenes" 
                className="w-full h-auto mb-8 object-cover rounded-md border border-[rgba(255,255,255,0.08)] shadow-2xl" 
              />
              <h2 className="text-[18px] font-medium tracking-wide text-[#f7f8f8] mb-6 leading-snug text-left" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>
                Hey! If you found any bugs or vulnerabilities, please inform us!
              </h2>
              <Button
                href="https://github.com/HypaStack/Hypastack-Open-Source"
                target="_blank"
                rel="noopener noreferrer"
                variant="landing-secondary"
                size="md"
              >
                Source code
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
