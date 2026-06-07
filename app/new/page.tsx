"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Script from "next/script"
import Turnstile from "react-turnstile"
import { MIcon } from "@/components/ui/material-icon"
import { isTauri } from "@/lib/tauri"
import { PageLogo } from "@/components/page-logo"
import { useAuth } from "@/hooks/useAuth"
import { generateUserIdClient, generateAccessKeyClient, deriveMasterKey, encryptE2E, storeSessionKey } from "@/lib/crypto-client"

const FEATURES = [
  { icon: "shield", label: "Zero-knowledge encryption" },
  { icon: "bolt", label: "Instant CDN delivery" },
  { icon: "link", label: "Permanent shareable links" },
  { icon: "lock", label: "No email. No tracking." },
]

export default function CreateAccountPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [nickname, setNickname] = useState("")
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState(process.env.NODE_ENV === "development" ? "dev-bypass" : "")
  const [isDesktop, setIsDesktop] = useState(false)
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  useEffect(() => { setIsDesktop(isTauri()) }, [])
  useEffect(() => {
    if (!authLoading && isAuthenticated) window.location.href = "/manage/files"
  }, [isAuthenticated, authLoading])

  const isNicknameValid = nickname.length > 0 && nickname.length <= 100
  const canSubmit = isNicknameValid && ageConfirmed && !isLoading && (turnstileToken || process.env.NODE_ENV === "development")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!canSubmit) return
    setIsLoading(true)
    try {
      const userId = generateUserIdClient()
      const accessKey = generateAccessKeyClient(userId)
      const masterKey = await deriveMasterKey(accessKey, userId)
      const nickname_encrypted = await encryptE2E(nickname, masterKey)
      const csrfRes = await fetch("/api/v2/csrf", { credentials: "include" })
      const csrfData = await csrfRes.json()
      const csrfToken: string = csrfData.token
      const response = await fetch("/api/v2/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, accessKey, nickname_encrypted, turnstileToken, csrfToken }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to create account")
      await storeSessionKey(masterKey)
      setGeneratedKey(accessKey)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!generatedKey) return
    try {
      await navigator.clipboard.writeText(generatedKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {}
  }

  const RightPanel = () => (
    <div
      className="hidden lg:flex w-[440px] xl:w-[540px] shrink-0 flex-col justify-center items-start p-10 xl:p-14 bg-[#f4f4f5]"
    >
      <div className="w-full">
        <img 
          src="https://r2.hypastack.com/cdn/8pnp1fg9kk1f/dashboard.png" 
          alt="Behind the scenes" 
          className="w-full h-auto mb-6 object-cover" 
          style={{ borderRadius: 12 }} 
        />
        <h2 className="text-[18px] font-semibold text-[#111] mb-5 leading-snug text-left" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>
          Look how Hypastack looks behind the scenes
        </h2>
        <a
          href="https://github.com/HypaStack/Hypastack-Open-Source"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-[#e5e5e5] text-[#111] text-[13px] font-medium px-4 py-1.5 hover:bg-[#d5d5d5] active:scale-[0.98] transition-all"
          style={{ borderRadius: 8 }}
        >
          Take a look
        </a>
      </div>
    </div>
  )

  if (generatedKey) {
    return (
      <div className="flex min-h-screen bg-[#ffffff]">
        <div className="relative flex flex-1 flex-col items-center lg:items-start lg:pl-[12%] xl:pl-[16%] justify-center px-8 py-12">
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.13) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          />
          <div className="relative z-10 w-full max-w-[360px]">
            <div className="mb-9">
              <PageLogo size={44} borderRadius={10} />
            </div>

            <h1
              className="text-[28px] font-semibold tracking-tight text-[#111] mb-1"
              style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
            >
              Account created
            </h1>
            <p className="text-[14px] text-[#888] mb-8">Save your access key somewhere safe — it&apos;s the only way to sign in.</p>

            <div className="border border-[rgba(0,0,0,0.12)] bg-[#f9f9f9] rounded-[8px] mb-5">
              <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[rgba(0,0,0,0.07)]">
                <span className="text-[10px] font-semibold text-[#bbb] uppercase tracking-widest">Access Key</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-[#888] hover:text-[#111] transition-colors"
                >
                  <MIcon name={copied ? "check" : "content_copy"} size={13} />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="px-4 py-3.5 text-[12.5px] text-[#111] break-all leading-[1.7] select-all font-mono">
                {generatedKey}
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-[12px] text-[#888] mb-6 leading-relaxed">
              <MIcon name="warning" size={14} className="shrink-0 mt-0.5 text-[#c47f00]" />
              <span>
                This key is your <span className="text-[#111] font-semibold">only way to log in</span>. We don&apos;t store it — if you lose it, your account is permanently inaccessible.
              </span>
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none mb-5">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#111] shrink-0"
              />
              <span className="text-[13px] text-[#555]">I have saved my access key in a secure location.</span>
            </label>

            <button
              onClick={() => { window.location.href = "/signin" }}
              disabled={!confirmed}
              className="w-full bg-[#111] text-white text-[14px] font-semibold hover:bg-[#2a2a2a] active:scale-[0.99] transition-all duration-75 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ borderRadius: 8, height: 40 }}
            >
              Continue to sign in
            </button>
          </div>
        </div>
        {!isDesktop && <RightPanel />}
      </div>
    )
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
              Create account
            </h1>
            {!isDesktop && (
              <p className="text-[14px] text-[#555] mb-8">Pick a username. Your access key is generated for you.</p>
            )}

            {error && (
              <div className="flex items-start gap-2 text-[13px] text-[#c0392b] bg-[#fff5f5] border border-[#ffd7d5] p-3 rounded-[8px] mb-5">
                <MIcon name="error" size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-[12px] font-medium text-[#333] mb-1.5">Username</label>

              <div
                className="flex items-center border border-[rgba(0,0,0,0.15)] bg-white focus-within:border-[#111] transition-colors"
                style={{ borderRadius: 8 }}
              >
                <span className="pl-3 text-[#888]"><MIcon name="person" size={15} /></span>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Your name"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  required
                  className="flex-1 bg-transparent pl-2.5 pr-4 py-2.5 text-[14px] text-[#111] placeholder:text-[#888] focus:outline-none"
                />
              </div>

              {nickname.length > 100 && (
                <p className="text-[12px] text-[#c0392b]">Username must be 100 characters or fewer</p>
              )}

              <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#111] shrink-0"
                />
                <span className="text-[12px] text-[#555] leading-relaxed">
                  I am at least 18 years old and accept the{" "}
                  <Link href="/terms" className="text-[#111] font-semibold hover:underline">Terms</Link>
                  {" "}&amp;{" "}
                  <Link href="/privacy" className="text-[#111] font-semibold hover:underline">Privacy Policy</Link>.
                </span>
              </label>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-[#111] text-white text-[14px] font-semibold hover:bg-[#2a2a2a] active:scale-[0.99] transition-all duration-75 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ borderRadius: 8, height: 40 }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <MIcon name="progress_activity" size={15} className="animate-spin" />
                    Creating…
                  </span>
                ) : "Create account"}
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

            <p className="mt-8 text-[13px] text-[#666]">
              Already have an account?{" "}
              <Link href="/signin" className="text-[#111] font-semibold hover:underline">
                Sign in
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

        {!isDesktop && <RightPanel />}
      </div>
    </>
  )
}
