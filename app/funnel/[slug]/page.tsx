"use client"

import { useEffect, useRef, useState, use } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import Turnstile from "react-turnstile"
import { MIcon } from "@/components/ui/material-icon"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { SideAd } from "@/components/ui/side-ad"
import { Button, Card, Chip, Typography } from "@heroui/react"
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

  const selectFile = (f: File | null) => {
    setSendError("")
    setFileError("")
    if (!f) return setFile(null)
    if (meta && f.size > meta.maxUploadSize) {
      setFile(null)
      setFileError(`That file is ${fmt(f.size)} — this funnel accepts up to ${fmt(meta.maxUploadSize)}.`)
      return
    }
    setFile(f)
  }

  const busy = dropState === "encrypting" || dropState === "uploading"
  const done = dropState === "done"
  const canSend = !!file && !!meta && (isDev || !!turnstileToken) && dropState === null

  const handleSend = async () => {
    if (!file || !meta) return
    setSendError("")
    try {
      await dropFile({ slug, file, publicKeySpki: meta.publicKey, csrfToken, turnstileToken, onState: setDropState })
    } catch (err) {
      setDropState(null)
      setTurnstileToken("")
      setSendError(errorMessage(err, "Something went wrong. Please try again."))
    }
  }

  const ownerName = meta?.owner.displayName ? `@${meta.owner.displayName}` : "someone"
  const ext = file?.name.includes(".") ? file.name.split(".").pop()!.slice(0, 5) : ""

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
              <Card.Header className="flex-row items-start gap-3">
                <img
                  src={meta.owner.avatarUrl || "https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp"}
                  alt=""
                  className="h-[52px] w-[52px] rounded-md object-cover border-2 border-overlay bg-muted select-none pointer-events-none shrink-0"
                  draggable={false}
                  onError={(e) => { (e.target as HTMLImageElement).src = "https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp" }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Card.Title className="text-lg truncate">Send a file to {ownerName}</Card.Title>
                    {meta.owner.verified && (
                      <span title="Verified account" className="shrink-0 inline-flex items-center text-[#3ba7ff]">
                        <MIcon name="verified" size={17} />
                      </span>
                    )}
                  </div>
                  <Card.Description>Encrypted in your browser before it leaves your device.</Card.Description>
                </div>
              </Card.Header>

              <Card.Content className="flex flex-wrap gap-2">
                <Chip size="sm" variant="soft" className="gap-1">
                  <MIcon name="shield" size={14} />
                  End-to-end encrypted
                </Chip>
                <Chip size="sm" variant="soft" className="gap-1">
                  <MIcon name="data_usage" size={14} />
                  Up to {fmt(meta.maxUploadSize)}
                </Chip>
                <Chip size="sm" variant="soft" className="gap-1">
                  <MIcon name="counter_1" size={14} />
                  One file, once
                </Chip>
              </Card.Content>

              {!done && (
                <Card.Content>
                  <Card variant="transparent" className="!p-0 bg-surface rounded-[10px] overflow-hidden">
                    {!file ? (
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); selectFile(e.dataTransfer.files?.[0] || null) }}
                        className="w-full flex items-center justify-between px-4 h-[52px] text-left hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5 text-muted">
                          <MIcon name="attach_file" size={15} />
                          <Typography type="body-sm" color="muted">Choose a file or drop it here</Typography>
                        </span>
                        <Typography type="body-sm" weight="semibold" className="text-foreground">Browse</Typography>
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 px-4 h-[52px]">
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <Typography type="body-sm" weight="medium" className="truncate text-foreground">{file.name}</Typography>
                            {ext && <Chip size="sm" variant="soft" className="uppercase tracking-wider text-[10px] font-semibold shrink-0">{ext}</Chip>}
                          </div>
                          <Typography type="body-xs" color="muted" className="mt-0.5">{fmt(file.size)}</Typography>
                        </div>
                        {!busy && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onPress={() => selectFile(null)}
                            aria-label="Remove file"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    )}
                  </Card>
                </Card.Content>
              )}

              <input ref={inputRef} type="file" className="hidden" onChange={(e) => selectFile(e.target.files?.[0] || null)} />

              {(busy || done) && (
                <Card.Content>
                  <AlertMessage tone={done ? "success" : "info"} style={{ marginBottom: 0 }}>
                    {done
                      ? `Your file is on its way to ${ownerName}. This link is now closed.`
                      : dropState === "encrypting"
                      ? "Encrypting your file in this browser. Larger files take a little longer, don't close this tab."
                      : "Your file is uploading securely in the background. This may take a moment depending on your connection speed."}
                  </AlertMessage>
                </Card.Content>
              )}

              {(fileError || sendError) && (
                <Card.Content>
                  <AlertMessage tone="error" style={{ marginBottom: 0 }}>
                    {fileError || sendError}
                  </AlertMessage>
                </Card.Content>
              )}

              {file && !done && !isDev && (
                <Card.Content className="flex justify-center">
                  <Turnstile
                    sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                    onVerify={(token) => setTurnstileToken(token)}
                    onExpire={() => setTurnstileToken("")}
                    theme="dark"
                  />
                </Card.Content>
              )}

              {!done && (
                <Card.Footer>
                  <Button
                    variant="primary"
                    onPress={handleSend}
                    isDisabled={!canSend}
                    fullWidth
                    style={{ gap: 8 }}
                  >
                    {busy ? (
                      <><LoadingSvg size={16} />{dropState === "encrypting" ? "Encrypting…" : "Sending…"}</>
                    ) : (
                      <><MIcon name="send" size={16} />Send file</>
                    )}
                  </Button>
                </Card.Footer>
              )}
            </Card>

            <Typography type="body-xs" color="muted" className="mt-3 px-2 leading-relaxed text-center">
              Your file is encrypted on this device before it&apos;s uploaded, so only {ownerName} can open it. Anyone can set a
              name and avatar. Hypastack doesn&apos;t vet profiles, so only accounts showing a{" "}
              <span className="inline-flex items-center gap-0.5 align-middle text-muted"><MIcon name="verified" size={12} />Verified</span>{" "}
              badge are confirmed.
            </Typography>
          </motion.div>
        )}
      </div>
    </main>
  )
}
