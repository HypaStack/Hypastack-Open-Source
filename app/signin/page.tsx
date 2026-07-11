"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Turnstile from "react-turnstile"
import { MIcon } from "@/components/ui/material-icon"
import { isTauri } from "@/lib/tauri"
import { PageLogo } from "@/components/page-logo"
import { useAuth } from "@/hooks/useAuth"
import { deriveMasterKey, storeSessionKey, extractUserIdFromAccessKey } from "@/lib/security/cryptoClient"
import { apiFetch } from "@/lib/http/fetch"
import { ShineButton } from "@/components/ui/shine-button"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { AlertMessage } from "@/components/ui/alert-message"
import { TextInput } from "@/components/ui/text-input"
import { Loader } from "@/components/ui/loader"
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
      // cid_ identifiers don't embed the id, so the server returns it; legacy
      // hpsk_ keys fall back to extracting it locally.
      const userId = data.userId || extractUserIdFromAccessKey(accessKey)
      if (!userId) throw new Error("Invalid identifier format")
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
      <div className="flex min-h-screen bg-[#151515]">
        <div className="relative flex flex-1 flex-col items-center lg:items-start lg:pl-[12%] xl:pl-[16%] justify-center px-8 py-12">
          <div className="relative z-10 w-full max-w-[360px]">
            <div className="mb-9">
              <img 
                src="https://r2.hypastack.com/cdn/lvko6iovrtq7/footer.webp" 
                alt="Hypastack" 
                className="w-[44px] h-[44px] object-contain"
              />
            </div>
            <h1
              className="text-[28px] font-semibold tracking-tight text-[#f7f8f8] mb-6"
              style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
            >
              Sign in
            </h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                  <label className="block text-[13px] font-medium text-[#f7f8f8] mb-2 pl-1">Identifier</label>
                  <TextInput
                    type={showKey ? "text" : "password"}
                    value={accessKey}
                    disabled={isLoading}
                    onChange={(e) => setAccessKey(e.target.value)}
                    placeholder="cid_..."
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    required
                    fullWidth
                    style={{ fontFamily: "var(--font-mono, monospace)" }}
                    leading={<MIcon name="key" size={16} />}
                    trailing={
                      <SecondaryButton
                        iconOnly
                        size="xs"
                        onClick={() => setShowKey(!showKey)}
                        aria-label={showKey ? "Hide" : "Show"}
                      >
                        {showKey ? <MIcon name="visibility_off" size={18} /> : <MIcon name="visibility" size={18} />}
                      </SecondaryButton>
                    }
                  />

                </div>
                {error && (
                  <div>
                    <AlertMessage tone="error" style={{ marginBottom: 0 }}>{error}</AlertMessage>
                  </div>
                )}
                <ShineButton
                  type="submit"
                  disabled={isLoading || !accessKey || (!turnstileToken && process.env.NODE_ENV !== "development")}
                  fullWidth
                  variant="primary"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader size={18} color="#ffffff" />
                      Signing in…
                    </span>
                  ) : "Sign in"}
                </ShineButton>
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
            <p className="mt-4 text-[13px] text-[#898e97] pl-1">
              No account?{" "}
              <Link href="/new" className="text-[#f7f8f8] font-semibold hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
        {!isDesktop && (
          <div
            className="hidden lg:flex w-[440px] xl:w-[540px] shrink-0 flex-col justify-center items-start p-10 xl:p-14 bg-[#1e1e20] border-l border-[rgba(255,255,255,0.1)] relative overflow-hidden"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)] pointer-events-none" />
            <div className="w-full relative z-10">
              <img 
                src="https://r2.hypastack.com/cdn/8pnp1fg9kk1f/dashboard.png" 
                alt="Behind the scenes" 
                className="w-full h-auto mb-5 object-cover rounded-[12px] border border-[rgba(255,255,255,0.08)] shadow-2xl"
              />
              <h2 className="text-[18px] font-medium tracking-wide text-[#f7f8f8] mb-4 leading-snug text-left" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>
                Found a bug or vulnerability? Let us know.
              </h2>
              <SecondaryButton
                href="https://github.com/HypaStack/Hypastack-Open-Source"
                target="_blank"
                rel="noopener noreferrer"
                size="md"
              >
                Source code
              </SecondaryButton>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
