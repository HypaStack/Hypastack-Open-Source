"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Turnstile from "react-turnstile"
import { MIcon } from "@/components/ui/material-icon"
import { useAuth } from "@/hooks/useAuth"
import { generateUserIdClient, generateIdentifierClient, deriveMasterKey, encryptE2E, storeSessionKey } from "@/lib/security/cryptoClient"
import { isBiometricSupported, enrollBiometric } from "@/lib/security/biometric"
import { apiFetch } from "@/lib/http/fetch"
import { Button, TextField, Label, InputGroup } from "@heroui/react"
import { AlertMessage } from "@/components/ui/alert-message"
import { ShineCard } from "@/components/ui/shine-card"
import { Checkmark } from "@/components/ui/checkmark"
import { errorMessage } from "@/lib/errors"

export default function CreateAccountPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [nickname, setNickname] = useState("")
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState(process.env.NODE_ENV === "development" ? "dev-bypass" : "")
  const [bioSupported, setBioSupported] = useState(false)
  const [bioEnrolling, setBioEnrolling] = useState(false)
  const [bioEnabled, setBioEnabled] = useState(false)
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  useEffect(() => { isBiometricSupported().then(setBioSupported) }, [])

  const handleEnrollBio = async () => {
    if (!generatedKey) return
    setBioEnrolling(true)
    const ok = await enrollBiometric(generatedKey)
    setBioEnrolling(false)
    setBioEnabled(ok)
  }
  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace("/me/files")
  }, [isAuthenticated, authLoading, router])

  // Username policy: letters/numbers only, no spaces or symbols, 3–12 chars.
  const nicknameError =
    nickname.length === 0 ? "" :
    /\s/.test(nickname) ? "No spaces allowed." :
    !/^[A-Za-z0-9]*$/.test(nickname) ? "Letters and numbers only — no symbols." :
    nickname.length < 3 ? "Must be at least 3 characters." :
    nickname.length > 12 ? "Must be 12 characters or fewer." : ""
  const isLengthError = nickname.length > 0 && (nickname.length < 3 || nickname.length > 12) && /^[A-Za-z0-9]*$/.test(nickname)
  const isNicknameValid = /^[A-Za-z0-9]{3,12}$/.test(nickname)
  const canSubmit = isNicknameValid && ageConfirmed && !isLoading && (turnstileToken || process.env.NODE_ENV === "development")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!canSubmit) return
    setIsLoading(true)
    try {
      const userId = generateUserIdClient()
      const accessKey = generateIdentifierClient()
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
    } catch (err) {
      setError(errorMessage(err))
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

  if (generatedKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d0d0d] px-8 py-12">
        <div className="relative z-10 w-full max-w-[360px]">
            <div className="mb-9">
              <img
                src="https://r2.hypastack.com/cdn/lvko6iovrtq7/footer.webp"
                alt="Hypastack"
                className="w-[44px] h-[44px] object-contain"
              />
            </div>

            <h1
              className="text-[28px] font-semibold tracking-tight text-[#f7f8f8] mb-1"
              style={{ fontFamily: "'Instrument Sans', var(--font-syne), 'Syne', sans-serif" }}
            >
              Account created
            </h1>
            <p className="text-[14px] text-[#898e97] mb-8">Save your identifier somewhere safe, it's the only way to sign in.</p>

            <ShineCard highlight radius={16} className="mb-5 p-4">
              <div className="w-full flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold text-[#898e97] uppercase tracking-widest">Identifier</span>
                <Button variant="tertiary" onPress={handleCopy} size="sm" style={{ gap: 6 }}>
                  <MIcon name={copied ? "check" : "content_copy"} size={13} />
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="w-full text-[12.5px] text-[#f7f8f8] break-all leading-[1.7] font-mono blur-[5px] select-none pointer-events-none">
                {generatedKey}
              </div>
            </ShineCard>

            {bioSupported && (
              bioEnabled ? (
                <div className="mb-3 flex items-center justify-center gap-2 text-[13px] text-[#4ade80]">
                  <MIcon name="check_circle" size={16} />
                  Biometric unlock enabled on this device
                </div>
              ) : (
                <Button
                  variant="tertiary"
                  onPress={handleEnrollBio}
                  isDisabled={bioEnrolling}
                  fullWidth
                  size="lg"
                  style={{ marginBottom: 12 }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <MIcon name="fingerprint" size={18} />
                    {bioEnrolling ? "Setting up…" : "Enable biometric unlock"}
                  </span>
                </Button>
              )
            )}

            <Button
              variant="primary"
              onPress={() => { window.location.href = "/me/files" }}
              size="lg"
              fullWidth
            >
              Continue
            </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-[#0d0d0d] px-8 py-12">
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
              style={{ fontFamily: "'Instrument Sans', var(--font-syne), 'Syne', sans-serif" }}
            >
              Create account
            </h1>

            {error && (
              <AlertMessage tone="error" className="mb-5">
                {error}
              </AlertMessage>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <TextField isRequired value={nickname} onChange={setNickname} className="w-full">
                  <Label>Username</Label>
                  <InputGroup fullWidth>
                    <InputGroup.Input
                      type="text"
                      placeholder="Your name"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore="true"
                    />
                    <InputGroup.Suffix>
                      <MIcon name="person" size={16} />
                    </InputGroup.Suffix>
                  </InputGroup>
                </TextField>
              </div>

              {nicknameError && (
                isLengthError ? (
                  <AlertMessage tone="error">{nicknameError}</AlertMessage>
                ) : (
                  <p className="text-[12px] text-[#ff6b6b] pl-1">{nicknameError}</p>
                )
              )}

              <Checkmark
                checked={ageConfirmed}
                onChange={setAgeConfirmed}
                size={16}
              >
                <span className="text-[12px] text-[#c4c9d2]">
                  I accept the{" "}
                  <Link href="/terms" className="text-[#f7f8f8] font-semibold hover:underline">Terms</Link>
                  {" "}&amp;{" "}
                  <Link href="/privacy" className="text-[#f7f8f8] font-semibold hover:underline">Privacy Policy</Link>
                </span>
              </Checkmark>

              <Button
                variant="primary"
                type="submit"
                isDisabled={!canSubmit}
                fullWidth
              >
                {isLoading ? "Creating…" : "Create account"}
              </Button>

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
              Already have an account?{" "}
              <Link href="/signin" className="text-[#f7f8f8] font-semibold hover:underline">
                Sign in
              </Link>
            </p>
        </div>
      </div>
    </>
  )
}
