"use client"

import { useEffect, useRef, useState, use } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import Turnstile from "react-turnstile"
import { MIcon } from "@/components/ui/material-icon"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { ShineCard } from "@/components/ui/shine-card"
import { ShineButton } from "@/components/ui/shine-button"
import { SecondaryButton } from "@/components/ui/secondary-button"
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
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans bg-[#08090a] text-[#f7f8f8]">
      <div className="relative w-full max-w-[440px]">
        <div className="flex justify-center mb-8">
          <Link href="/" className="hover:opacity-80 transition-opacity active:scale-[0.97]">
            <img src="https://r2.hypastack.com/cdn/lvko6iovrtq7/footer.webp" className="select-none h-14 w-14 rounded-md object-contain" alt="Hypastack" draggable={false} />
          </Link>
        </div>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24">
            <LoadingSvg variant="white" size={32} />
          </motion.div>
        )}

        {!loading && closed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <ShineCard radius={16} className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <MIcon name="lock" className="text-[#898e97]" size={28} />
                <h2 className="text-[20px] font-semibold text-[#f7f8f8] tracking-tight">Funnel closed</h2>
              </div>
              <p className="text-[13px] text-[#898e97] mb-6 leading-relaxed">
                This drop link has already been used or doesn&apos;t exist. Funnel links work exactly once.
              </p>
              <div className="flex gap-2">
                <ShineButton href="/" as={Link} className="flex-1">Go home</ShineButton>
                <SecondaryButton href="/pricing" as={Link} size="lg" className="flex-1">Get Hypastack</SecondaryButton>
              </div>
            </ShineCard>
          </motion.div>
        )}

        {!loading && meta && !closed && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <ShineCard radius={16} tilt={0}>
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <img
                    src={meta.owner.avatarUrl || "https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp"}
                    alt=""
                    className="h-[52px] w-[52px] rounded-md object-cover border-2 border-[#1a1a1a] bg-[#151616] select-none pointer-events-none shrink-0"
                    draggable={false}
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp" }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h1 className="text-[18px] font-semibold tracking-tight text-[#c9ccd1] truncate leading-tight">
                        Send a file to {ownerName}
                      </h1>
                      {meta.owner.verified && (
                        <span title="Verified account" className="shrink-0 inline-flex items-center text-[#3ba7ff]">
                          <MIcon name="verified" size={17} />
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-[#898e97] mt-1">Encrypted in your browser before it leaves your device.</p>
                  </div>
                </div>
              </div>

              <div className="mx-3 mb-3 rounded-[10px] bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] overflow-hidden">
                {[
                  { icon: "shield", label: "Encryption", value: "End-to-end" },
                  { icon: "data_usage", label: "Maximum size", value: fmt(meta.maxUploadSize) },
                  { icon: "counter_1", label: "Link use", value: "One file, once" },
                ].map((r, i, arr) => (
                  <div key={r.label}>
                    <div className="flex items-center justify-between px-4 h-[44px]">
                      <span className="flex items-center gap-2.5 text-[13px] text-[#898e97]">
                        <MIcon name={r.icon} size={15} className="text-[#898e97]" />
                        {r.label}
                      </span>
                      <span className="text-[13px] font-semibold text-[#f7f8f8]">{r.value}</span>
                    </div>
                    {i < arr.length - 1 && <div className="h-px mx-4 bg-[rgba(255,255,255,0.07)]" />}
                  </div>
                ))}
              </div>

              {!done && (
                <div className="mx-3 mb-3 rounded-[10px] bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] overflow-hidden">
                  {!file ? (
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); selectFile(e.dataTransfer.files?.[0] || null) }}
                      className="w-full flex items-center justify-between px-4 h-[52px] text-left hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5 text-[13px] text-[#898e97]">
                        <MIcon name="attach_file" size={15} className="text-[#898e97]" />
                        Choose a file or drop it here
                      </span>
                      <span className="text-[13px] font-semibold text-[#f7f8f8]">Browse</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 px-4 h-[52px]">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <p className="truncate text-[13px] font-medium leading-tight text-[#f7f8f8]">{file.name}</p>
                          {ext && (
                            <span className="shrink-0 rounded-[5px] bg-white/[0.08] px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide text-[#898e97]">
                              {ext}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[12px] text-[#898e97]">{fmt(file.size)}</p>
                      </div>
                      {!busy && (
                        <SecondaryButton
                          variant="ghost"
                          theme="dark"
                          size="xs"
                          onClick={() => selectFile(null)}
                          aria-label="Remove file"
                        >
                          Remove
                        </SecondaryButton>
                      )}
                    </div>
                  )}
                </div>
              )}

              <input ref={inputRef} type="file" className="hidden" onChange={(e) => selectFile(e.target.files?.[0] || null)} />

              {(busy || done) && (
                <div className="mx-3 mb-3">
                  <AlertMessage tone={done ? "success" : "info"} style={{ marginBottom: 0 }}>
                    {done
                      ? `Your file is on its way to ${ownerName}. This link is now closed.`
                      : dropState === "encrypting"
                      ? "Encrypting your file in this browser. Larger files take a little longer, don't close this tab."
                      : "Your file is uploading securely in the background. This may take a moment depending on your connection speed."}
                  </AlertMessage>
                </div>
              )}

              {(fileError || sendError) && (
                <div className="mx-3 mb-3">
                  <AlertMessage tone="error" style={{ marginBottom: 0 }}>
                    {fileError || sendError}
                  </AlertMessage>
                </div>
              )}

              {file && !done && !isDev && (
                <div className="mx-3 mb-3 flex justify-center rounded-[10px] bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] px-3 py-3">
                  <Turnstile
                    sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                    onVerify={(token) => setTurnstileToken(token)}
                    onExpire={() => setTurnstileToken("")}
                    theme="dark"
                  />
                </div>
              )}

              {!done && (
                <div className="px-3 pb-3">
                  <SecondaryButton
                    onClick={handleSend}
                    disabled={!canSend}
                    size="lg"
                    fullWidth
                    style={{ gap: 8 }}
                  >
                    {busy ? (
                      <><LoadingSvg size={16} />{dropState === "encrypting" ? "Encrypting…" : "Sending…"}</>
                    ) : (
                      <><MIcon name="send" size={16} />Send file</>
                    )}
                  </SecondaryButton>
                </div>
              )}
            </ShineCard>

            <p className="mt-3 px-2 text-[11px] leading-relaxed text-[#6b7079] text-center">
              Your file is encrypted on this device before it&apos;s uploaded, so only {ownerName} can open it. Anyone can set a
              name and avatar. Hypastack doesn&apos;t vet profiles, so only accounts showing a{" "}
              <span className="inline-flex items-center gap-0.5 align-middle text-[#8a9099]"><MIcon name="verified" size={12} />Verified</span>{" "}
              badge are confirmed.
            </p>
          </motion.div>
        )}
      </div>
    </main>
  )
}
