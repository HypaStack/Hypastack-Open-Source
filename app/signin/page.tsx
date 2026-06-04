"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Script from "next/script"
import Turnstile from "react-turnstile"
import { motion, AnimatePresence } from "motion/react"
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

  useEffect(() => {
    setIsDesktop(isTauri())
  }, [])

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      window.location.href = "/manage/files"
    }
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

      if (!response.ok) {
        throw new Error(data.error || "Failed to sign in")
      }

      const userId = extractUserIdFromAccessKey(accessKey)
      if (!userId) throw new Error("Invalid access key format")

      const masterKey = await deriveMasterKey(accessKey, userId)
      await storeSessionKey(masterKey)

      const params = new URLSearchParams(window.location.search)
      const redirect = params.get("redirect")
      const target = redirect && redirect.startsWith("/") && !redirect.startsWith("//") && !redirect.includes("://")
        ? redirect
        : "/manage/files"
      window.location.href = target
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
      <div className="relative flex min-h-screen flex-col bg-[#ffffff] text-[#171717]">
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-60"
        style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px', backgroundPosition: 'center' }}
      />

      <main className="flex flex-1 items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-[380px]">
          <div className="flex justify-center mb-8">
            <PageLogo size={56} borderRadius={12} pulse={isLoading} />
          </div>

          <h1 className="text-[32px] font-semibold tracking-tight text-[#171717] mb-2 text-center" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif", fontWeight: 700 }}>Login</h1>

          {!isDesktop && (
            <p className="text-[14px] text-[#525252] mb-7 text-center leading-relaxed">
              Enter your access key to sign in.
            </p>
          )}

          {error && (
            <div className="mb-5 flex items-start gap-2 text-[14px] text-[#d93036] font-medium px-1 bg-[#fff0f0] p-3 rounded-lg border border-[#ffd6d6]">
              <MIcon name="error" className="mt-0.5 shrink-0" size={18} />
              <span>{error}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {!isLoading ? (
              <motion.form
                key="form"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div className="relative border border-[rgba(0,0,0,0.15)] bg-white overflow-hidden transition-colors focus-within:border-[#171717]" style={{ borderRadius: 12 }}>
                  <div className="absolute left-3.5 inset-y-0 flex items-center justify-center text-[#888]">
                    <MIcon name="key" size={16} />
                  </div>
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
                    className="w-full bg-transparent pl-10 pr-12 py-3 text-[15px] text-[#171717] placeholder:text-[#a3a3a3] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3.5 inset-y-0 flex items-center justify-center text-[#888] hover:text-[#171717] transition-colors"
                    aria-label={showKey ? "Hide access key" : "Show access key"}
                  >
                    {showKey ? <MIcon name="visibility_off" size={20} /> : <MIcon name="visibility" size={20} />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!accessKey || (!turnstileToken && process.env.NODE_ENV !== "development")}
                  className="w-full bg-[#030303] py-3.5 text-[15px] font-semibold text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ borderRadius: 12 }}
                >
                  Sign in
                </button>
                {process.env.NODE_ENV !== "development" && (
                  <div className="flex justify-center mt-4">
                    <Turnstile 
                      sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""} 
                      onVerify={(t) => setTurnstileToken(t)} 
                      onExpire={() => setTurnstileToken("")}
                    />
                  </div>
                )}
              </motion.form>
            ) : (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-8"
              />
            )}
          </AnimatePresence>

          {!isDesktop && (
            <div className="mt-6 border border-[rgba(0,0,0,0.1)] bg-[#fafafa] p-4" style={{ borderRadius: 12 }}>
              <div className="text-[13px] text-[#525252] leading-relaxed">
                <strong className="text-[#171717] font-semibold block mb-1">Lost your key?</strong>
                Access keys cannot be recovered. If you've lost it, your account is permanently inaccessible. This is by design for your privacy.
              </div>
            </div>
          )}

          <div className={`${isDesktop ? "mt-5" : "mt-8"} pt-6 border-t border-[rgba(0,0,0,0.1)] text-center`}>
            <p className="text-[14px] text-[#525252]">
              Don&apos;t have an account?{" "}
              <Link href="/new" className="text-[#171717] font-semibold hover:underline transition-colors">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </main>

      {!isDesktop && (
        <footer className="pb-8 sm:pb-10 relative z-10">
          <div className="flex items-center justify-center gap-8 text-[13px] font-medium text-[#525252]">
            <Link href="/terms" className="hover:text-[#171717] transition-colors">
              Terms and conditions
            </Link>
            <Link href="/help" className="hover:text-[#171717] transition-colors">
              Need help?
            </Link>
          </div>
        </footer>
      )}
    </div>
    </>
  )
}
