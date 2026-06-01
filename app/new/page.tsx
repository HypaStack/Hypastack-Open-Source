"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Script from "next/script"
import Turnstile from "react-turnstile"
import { motion } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { isTauri } from "@/lib/tauri"
import { PageLogo } from "@/components/page-logo"
import { useAuth } from "@/hooks/useAuth"
import { generateUserIdClient, generateAccessKeyClient, deriveMasterKey, encryptE2E, storeSessionKey } from "@/lib/crypto-client"

export default function CreateAccountPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [nickname, setNickname] = useState("")
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState("")
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

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account")
      }

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
    } catch {
      // Fallback
    }
  }

  const handleContinue = () => {
    window.location.href = "/signin"
  }

  // --- KEY DISPLAY SCREEN ---
  if (generatedKey) {
    return (
      <div className="relative flex min-h-screen flex-col bg-[#ffffff] text-[#171717]">
        {/* Dotted bg */}
        <div
          className="absolute inset-0 pointer-events-none z-0 opacity-60"
          style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px', backgroundPosition: 'center' }}
        />
        <main className="flex flex-1 items-center justify-center px-6 py-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[380px]"
          >
            <div className="flex justify-center mb-8">
              <PageLogo size={56} borderRadius={12} />
            </div>

            <h1 className="text-[32px] font-semibold tracking-tight text-[#171717] mb-2 text-center" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif", fontWeight: 700 }}>Account created</h1>
            <p className="text-[14px] text-[#525252] mb-8 text-center leading-relaxed">
              Your access key has been generated. Save it somewhere safe.
            </p>

            {/* ACCESS KEY DISPLAY */}
            <div className="mb-6 w-full border border-[rgba(0,0,0,0.15)] bg-white overflow-hidden" style={{ borderRadius: 12 }}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] text-[#888] font-semibold uppercase tracking-wider">Access Key</span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-[#525252] hover:text-[#171717] transition-colors"
                  >
                    {copied ? (
                      <>
                        <MIcon name="check" className="text-[#171717]" size={14} />
                        <span className="text-[#171717]">Copied</span>
                      </>
                    ) : (
                      <>
                        <MIcon name="content_copy" size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="w-full text-[14px] text-[#171717] break-all leading-[1.6] select-all">
                  {generatedKey}
                </div>
              </div>
            </div>

            <p className="text-[13px] text-[#525252] leading-relaxed mb-8 bg-[#fafafa] border border-[rgba(0,0,0,0.1)] p-4 rounded-xl">
              This key is your <span className="text-[#171717] font-semibold">only way to log in</span>.{" "}
              We don&apos;t store it and it cannot be recovered.{" "}
              If you lose it, your account is permanently inaccessible.
            </p>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[rgba(0,0,0,0.2)] bg-transparent accent-[#171717] shrink-0"
              />
              <span className="text-[13.5px] text-[#525252] leading-relaxed font-medium">
                I have saved my access key in a secure location.
              </span>
            </label>

            <button
              onClick={handleContinue}
              disabled={!confirmed}
              className={`mt-6 w-full py-3.5 text-[15px] font-semibold transition-colors ${
                confirmed
                  ? "bg-[#030303] text-white hover:bg-[#1a1a1a]"
                  : "bg-[#e5e5e5] text-[#888] cursor-not-allowed"
              }`}
              style={{ borderRadius: 12 }}
            >
              Continue to login
            </button>
          </motion.div>
        </main>
      </div>
    )
  }

  // --- REGISTRATION FORM ---
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="beforeInteractive" />
      <div className="relative flex min-h-screen flex-col bg-[#ffffff] text-[#171717]">
        {/* Dotted bg */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-60"
        style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px', backgroundPosition: 'center' }}
      />
      <main className="flex flex-1 items-center justify-center px-6 py-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-[380px]"
        >
          <div className="flex justify-center mb-8">
            <PageLogo size={56} borderRadius={12} />
          </div>

          <h1 className="text-[32px] font-semibold tracking-tight text-[#171717] mb-2 text-center" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif", fontWeight: 700 }}>Create account</h1>

          {!isDesktop && (
            <p className="text-[14px] text-[#525252] mb-7 text-center leading-relaxed">
              Pick a username. Your access key will be generated automatically.
            </p>
          )}

          {error && (
            <div className="mb-5 flex items-start gap-2 text-[14px] text-[#d93036] font-medium px-1 bg-[#fff0f0] p-3 rounded-lg border border-[#ffd6d6]">
              <MIcon name="error" className="mt-0.5 shrink-0" size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username input */}
            <div className="border border-[rgba(0,0,0,0.15)] bg-white overflow-hidden transition-colors focus-within:border-[#171717]" style={{ borderRadius: 12 }}>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Username"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                required
                className="w-full bg-transparent px-4 py-3 text-[15px] text-[#171717] placeholder:text-[#a3a3a3] focus:outline-none"
              />
            </div>

            {nickname.length > 0 && nickname.length > 100 && (
              <p className="text-[12px] text-[#d93036] px-1 font-medium">Username too long</p>
            )}

            {/* Zero-knowledge info */}
            {!isDesktop && (
              <div className="bg-[#fafafa] border border-[rgba(0,0,0,0.1)] p-4 flex items-start gap-3" style={{ borderRadius: 12 }}>
                <MIcon name="key" className="mt-0.5 shrink-0 text-[#888]" size={16} />
                <p className="text-[13px] text-[#525252] leading-relaxed">
                  <strong className="text-[#171717] font-semibold">Zero-knowledge security.</strong>{" "}
                  No email, no password — you&apos;ll receive a unique access key.
                  This key is your <em>only</em> way to log in. We never see or store it.
                </p>
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer select-none mt-2 px-1">
              <input
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[rgba(0,0,0,0.2)] bg-transparent accent-[#171717] shrink-0"
              />
              <span className="text-[13px] text-[#525252] leading-relaxed">
                I confirm that I am at least 18 years old and I accept the{" "}
                <Link href="/terms" className="text-[#171717] font-semibold hover:underline">Terms of Service</Link>{" "}
                &amp;{" "}
                <Link href="/privacy" className="text-[#171717] font-semibold hover:underline">Privacy Policy</Link>.
              </span>
            </label>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full py-3.5 text-[15px] font-semibold transition-colors mt-2 ${
                canSubmit
                  ? "bg-[#030303] text-white hover:bg-[#1a1a1a]"
                  : "bg-[#e5e5e5] text-[#888] cursor-not-allowed"
              }`}
              style={{ borderRadius: 12 }}
            >
              {isLoading ? "Creating…" : "Create account"}
            </button>
            <div className="flex justify-center mt-4">
              <Turnstile 
                sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""} 
                onVerify={(t) => setTurnstileToken(t)} 
                onExpire={() => setTurnstileToken("")}
              />
            </div>
          </form>

          <div className={`${isDesktop ? "mt-5" : "mt-8"} pt-6 border-t border-[rgba(0,0,0,0.1)] text-center`}>
            <p className="text-[14px] text-[#525252]">
              Already have an account?{" "}
              <Link href="/signin" className="text-[#171717] font-semibold hover:underline transition-colors">
                Log in
              </Link>
            </p>
          </div>
        </motion.div>
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
