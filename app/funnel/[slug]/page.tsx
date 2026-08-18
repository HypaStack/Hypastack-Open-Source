"use client"

import { useEffect, useRef, useState, use } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import Turnstile from "react-turnstile"
import { MIcon } from "@/components/ui/material-icon"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { SideAd } from "@/components/ui/side-ad"
import { Button, Card, Chip } from "@heroui/react"
import { ButtonLink } from "@/components/ui/button-link"
import { AlertMessage } from "@/components/ui/alert-message"
import { apiFetch } from "@/lib/http/fetch"
import { dropFile, type DropState } from "@/components/funnel/transport"
import { errorMessage } from "@/lib/errors"

interface FunnelMeta {
  publicKey: string
  maxUploadSize: number
  owner: { displayName: string | null; avatarUrl: string | null; verified: boolean }
}

function fmt(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024, s = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + s[i]
}

const isDev = process.env.NODE_ENV === "development"

export default function FunnelDropPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)

  const [meta, setMeta] = useState<FunnelMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [closed, setClosed] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState("")
  const [csrfToken, setCsrfToken] = useState("")
  const [turnstileToken, setTurnstileToken] = useState("")
  const [dropState, setDropState] = useState<DropState | null>(null)
  const [sendError, setSendError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    apiFetch(`/api/v2/funnel/${slug}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("closed")
        setMeta(await res.json())
      })
      .catch(() => setClosed(true))
      .finally(() => setLoading(false))
    apiFetch("/api/v2/csrf")
      .then((res) => res.json())
      .then((data) => setCsrfToken(data.token || ""))
      .catch(() => {})
  }, [slug])

  const busy = dropState === "encrypting" || dropState === "uploading"
  const done = dropState === "done"

  const handleSend = async (f: File) => {
    if (!meta) return
    setSendError("")
    try {
      await dropFile({ slug, file: f, publicKeySpki: meta.publicKey, csrfToken, turnstileToken, onState: setDropState })
    } catch (err) {
      setDropState(null)
      setTurnstileToken("")
      setSendError(errorMessage(err, "Something went wrong. Please try again."))
    }
  }

  const selectFile = (f: File | null) => {
    setSendError("")
    setFileError("")
    if (!f) return
    if (meta && f.size > meta.maxUploadSize) {
      setFileError(`That file is ${fmt(f.size)} — this funnel accepts up to ${fmt(meta.maxUploadSize)}.`)
      return
    }
    setFile(f)
    // Auto-start: if Turnstile hasn't verified yet, wait for it — see the effect below.
    if (isDev || turnstileToken) handleSend(f)
  }

  // Picking a file before Turnstile verifies (widget is always mounted, so this
  // is rare but possible on a slow load) — send as soon as the token arrives.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (file && turnstileToken && dropState === null && !isDev) handleSend(file)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnstileToken])

  const ownerName = meta?.owner.displayName ? `@${meta.owner.displayName}` : "someone"

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans bg-background">
      <SideAd />
      <div className="relative w-full max-w-[440px]">
        <div className="flex justify-center mb-8">
          <Link href="/" className="hover:opacity-80 transition-opacity active:scale-[0.97]">
            <img src="https://r2.hypastack.com/cdn/hypaasset/hypastack.webp" className="select-none h-14 w-14 rounded-md object-contain" alt="Hypastack" draggable={false} />
          </Link>
        </div>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24">
            <LoadingSvg variant="white" size={32} />
          </motion.div>
        )}

        {!loading && closed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card variant="transparent" className="bg-overlay border !border-solid border-white/10 rounded-[16px]">
              <Card.Header className="gap-2">
                <Card.Title className="text-xl">Funnel closed</Card.Title>
                <Card.Description>
                  This drop link has already been used or doesn&apos;t exist. Funnel links work exactly once.
                </Card.Description>
              </Card.Header>
              <Card.Footer className="gap-2">
                <ButtonLink href="/" as={Link} variant="primary" className="flex-1">Go home</ButtonLink>
                <ButtonLink href="/pricing" as={Link} variant="tertiary" size="lg" className="flex-1">Get Hypastack</ButtonLink>
              </Card.Footer>
            </Card>
          </motion.div>
        )}

        {!loading && meta && !closed && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card variant="transparent" className="bg-overlay border !border-solid border-white/10 rounded-[16px]">
              <Card.Header className="gap-1">
                <div className="flex items-center justify-between gap-3">
                  <Card.Title className="text-lg truncate">Send a file to {ownerName}</Card.Title>
                  <Chip size="sm" variant="soft" className="shrink-0">Up to {fmt(meta.maxUploadSize)}</Chip>
                </div>
                <Card.Description>Encrypted in your browser before it leaves your device.</Card.Description>
              </Card.Header>

              {(fileError || sendError) && (
                <Card.Content>
                  <AlertMessage tone="error" style={{ marginBottom: 0 }}>
                    {fileError || sendError}
                  </AlertMessage>
                </Card.Content>
              )}

              {!done && !isDev && (
                <Card.Content className="flex justify-center">
                  <Turnstile
                    sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                    onVerify={(token) => setTurnstileToken(token)}
                    onExpire={() => setTurnstileToken("")}
                    theme="dark"
                  />
                </Card.Content>
              )}

              <input ref={inputRef} type="file" className="hidden" onChange={(e) => selectFile(e.target.files?.[0] || null)} />

              <Card.Footer>
                <Button
                  variant="primary"
                  onPress={() => inputRef.current?.click()}
                  isDisabled={busy || done}
                  fullWidth
                  style={{ gap: 8 }}
                >
                  {busy ? (
                    <><LoadingSvg size={16} />{dropState === "encrypting" ? "Encrypting…" : "Sending…"}</>
                  ) : done ? (
                    <><MIcon name="check" size={16} />Sent</>
                  ) : (
                    <><MIcon name="send" size={16} />Send file</>
                  )}
                </Button>
              </Card.Footer>
            </Card>
          </motion.div>
        )}
      </div>
    </main>
  )
}
