"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Turnstile from "react-turnstile"
import { MIcon } from "@/components/ui/material-icon"
import { isTauri } from "@/lib/tauri"
import { PageLogo } from "@/components/page-logo"
import { useAuth } from "@/hooks/useAuth"
import { generateUserIdClient, generateAccessKeyClient, deriveMasterKey, encryptE2E, storeSessionKey } from "@/lib/security/cryptoClient"
import { apiFetch } from "@/lib/http/fetch"
import { Button } from "@/components/ui/button"

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
  const [showConfirmation, setShowConfirmation] = useState(false)
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
      const csrfRes = await apiFetch("/api/v2/csrf", { credentials: "include" })
      const csrfData = await csrfRes.json()
      const csrfToken: string = csrfData.token
      const response = await apiFetch("/api/v2/auth/register", {
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
          Look how Hypastack looks behind the scenes
        </h2>
        <Button
          href="https://github.com/HypaStack/Hypastack-Open-Source"
          target="_blank"
          rel="noopener noreferrer"
          variant="landing-secondary"
          size="md"
        >
          Take a look
        </Button>
      </div>
    </div>
  )

  if (generatedKey) {
    return (
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
              Account created
            </h1>
            <p className="text-[14px] text-[#898e97] mb-8">Save your access key somewhere safe, it's the only way to sign in.</p>

            <div className="relative overflow-hidden rounded-[8px] p-[1px] mb-5">
              <div className="absolute inset-0 bg-[rgba(255,255,255,0.08)] z-0" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_40%,rgba(247,248,248,0.1)_70%,rgba(247,248,248,0.6)_100%)] blur-md z-0" />
              <div className="relative z-10 bg-[#0a0b0c] h-full w-full rounded-[7px] p-4 flex flex-col items-start overflow-hidden">
                <div className="w-full flex items-center justify-between mb-3">
                  <span className="text-[10px] font-semibold text-[#898e97] uppercase tracking-widest">Access Key</span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-[#898e97] hover:text-[#f7f8f8] transition-colors"
                  >
                    <MIcon name={copied ? "check" : "content_copy"} size={13} />
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="w-full text-[12.5px] text-[#f7f8f8] break-all leading-[1.7] font-mono blur-[5px] select-none pointer-events-none">
                  {generatedKey}
                </div>
              </div>
            </div>

            {!showConfirmation ? (
              <Button
                onClick={() => setShowConfirmation(true)}
                variant="landing-primary"
                size="lg"
                className="w-full"
              >
                Continue
              </Button>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-[14px] text-[#f7f8f8] font-medium text-center leading-relaxed">
                  Are you sure you copied it? It's the only way of logging in.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={handleCopy}
                    variant="landing-secondary"
                    size="lg"
                    className="flex-1"
                  >
                    Copy again
                  </Button>
                  <Button
                    onClick={() => { window.location.href = "/manage/files" }}
                    variant="landing-primary"
                    size="lg"
                    className="flex-1"
                  >
                    Yes
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        {!isDesktop && <RightPanel />}
      </div>
    )
  }

  return (
    <>
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
              Create account
            </h1>
            {!isDesktop && (
              <p className="text-[14px] text-[#898e97] mb-8">Pick a username. Your access key is generated for you.</p>
            )}

            {error && (
              <div className="flex items-center gap-2.5 text-[13px] text-[#ff6b6b] bg-[rgba(255,107,107,0.08)] border border-[rgba(255,107,107,0.2)] px-4 py-3 rounded-full mb-5">
                <MIcon name="error" size={15} className="shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#f7f8f8] mb-2 pl-1">Username</label>

                <div
                  className="flex items-center border border-[rgba(255,255,255,0.08)] bg-[#0a0b0c] focus-within:border-[rgba(255,255,255,0.2)] transition-colors rounded-full"
                >
                  <div className="pl-4 flex items-center justify-center text-[#898e97] h-full"><MIcon name="person" size={16} /></div>
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
                    className="flex-1 bg-transparent pl-2.5 pr-4 py-3 text-[14px] text-[#f7f8f8] placeholder:text-[#898e97] focus:outline-none rounded-full"
                  />
                </div>
              </div>

              {nickname.length > 100 && (
                <p className="text-[12px] text-[#ff6b6b] pl-1">Username must be 100 characters or fewer</p>
              )}

              <label className="flex items-start gap-3 cursor-pointer select-none pt-2">
                <div className="relative flex items-center justify-center shrink-0 mt-[3px] h-[16px] w-[16px]">
                  <input
                    type="checkbox"
                    checked={ageConfirmed}
                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                    className="peer appearance-none h-full w-full border border-[rgba(255,255,255,0.2)] bg-[#0a0b0c] rounded-[4px] checked:bg-[#f7f8f8] checked:border-[#f7f8f8] transition-all cursor-pointer focus:outline-none"
                  />
                  <MIcon name="check" size={13} className="absolute pointer-events-none text-[#08090a] opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <span className="text-[12px] text-[#898e97] leading-relaxed">
                  I am at least 18 years old and accept the{" "}
                  <Link href="/terms" className="text-[#f7f8f8] font-semibold hover:underline">Terms</Link>
                  {" "}&amp;{" "}
                  <Link href="/privacy" className="text-[#f7f8f8] font-semibold hover:underline">Privacy Policy</Link>.
                </span>
              </label>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  variant="landing-primary"
                  size="lg"
                  className="w-full"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <MIcon name="progress_activity" size={15} className="animate-spin" />
                      Creating…
                    </span>
                  ) : "Create account"}
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

            <p className="mt-8 text-[13px] text-[#898e97] pl-1">
              Already have an account?{" "}
              <Link href="/signin" className="text-[#f7f8f8] font-semibold hover:underline">
                Sign in
              </Link>
            </p>
            {!isDesktop && (
              <div className="mt-12 flex gap-5 text-[12px] text-[#898e97] pl-1">
                <Link href="/terms" className="hover:text-[#f7f8f8] transition-colors">Terms</Link>
                <Link href="/privacy" className="hover:text-[#f7f8f8] transition-colors">Privacy</Link>
                <Link href="/help" className="hover:text-[#f7f8f8] transition-colors">Help</Link>
              </div>
            )}
          </div>
        </div>

        {!isDesktop && <RightPanel />}
      </div>
    </>
  )
}
