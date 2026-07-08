"use client"

import { useEffect, useRef, useState, use } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import Turnstile from "react-turnstile"
import { MIcon } from "@/components/ui/material-icon"
import { Button } from "@/components/ui/button"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { apiFetch } from "@/lib/http/fetch"
import { dropFile, type DropState } from "@/components/funnel/transport"

interface FunnelMeta {
  publicKey: string
  maxUploadSize: number
  owner: { displayName: string | null; avatarUrl: string | null; verified: boolean }
}

function fmtBytes(bytes: number): string {
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
      setFileError(`That file is ${fmtBytes(f.size)} — this funnel accepts up to ${fmtBytes(meta.maxUploadSize)}.`)
      return
    }
    setFile(f)
  }

  const canSend = !!file && !!meta && (isDev || !!turnstileToken) && dropState === null

  const handleSend = async () => {
    if (!file || !meta) return
    setSendError("")
    try {
      await dropFile({
        slug,
        file,
        publicKeySpki: meta.publicKey,
        csrfToken,
        turnstileToken,
        onState: setDropState,
      })
    } catch (err: any) {
      setDropState(null)
      setTurnstileToken("")
      setSendError(err?.message || "Something went wrong. Please try again.")
    }
  }

  const ownerName = meta?.owner.displayName ? `@${meta.owner.displayName}` : "someone"
  const busy = dropState === "encrypting" || dropState === "uploading"
  const done = dropState === "done"

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans bg-[#08090a]">
      <div className="relative w-full max-w-[440px]">
        <div className="flex justify-center mb-8">
          <Link href="/" className="hover:opacity-80 transition-opacity active:scale-[0.97]">
            <img
              src="https://r2.hypastack.com/cdn/lvko6iovrtq7/footer.webp"
              className="select-none h-14 w-14 rounded-md object-contain"
              alt="Hypastack"
              draggable={false}
            />
          </Link>
        </div>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24">
            <LoadingSvg variant="white" size={32} />
          </motion.div>
        )}

        {!loading && closed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-[#0a0b0c] border border-[rgba(255,255,255,0.08)] rounded-[8px] p-6">
              <div className="flex items-center gap-3 mb-3">
                <MIcon name="lock" className="text-[#898e97]" size={26} />
                <h2 className="text-[20px] font-semibold text-[#f7f8f8] tracking-tight">Funnel closed</h2>
              </div>
              <p className="text-[13px] text-[#898e97] mb-6 leading-relaxed">
                This drop link has already been used or doesn't exist. Funnel links work exactly once.
              </p>
              <Button href="/" variant="landing-secondary" className="w-full">Go home</Button>
            </div>
          </motion.div>
        )}

        {!loading && meta && !closed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="bg-[#0a0b0c] border border-[rgba(255,255,255,0.08)] rounded-[8px] overflow-hidden">
              {busy ? (
                <div className="flex flex-col items-center justify-center text-center px-6 py-16">
                  <LoadingSvg variant="white" size={36} />
                  <p className="mt-6 text-[15px] font-medium text-[#f7f8f8]">We've got you.</p>
                  <p className="mt-1.5 text-[13px] text-[#898e97] leading-relaxed max-w-[280px]">
                    Sit back and relax while your file is encrypted and sent — this can take a moment for larger files.
                  </p>
                </div>
              ) : done ? (
                <div className="flex flex-col items-center justify-center text-center px-6 py-16">
                  <div className="flex items-center justify-center h-14 w-14 rounded-full bg-[rgba(34,197,94,0.12)] mb-5">
                    <MIcon name="check" className="text-green-500" size={30} />
                  </div>
                  <p className="text-[17px] font-semibold text-[#f7f8f8] tracking-tight">Sent</p>
                  <p className="mt-1.5 text-[13px] text-[#898e97] leading-relaxed max-w-[280px]">
                    Your file is on its way to {ownerName}. This link is now closed.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-5 pb-4 flex items-center gap-3">
                    <img
                      src={meta.owner.avatarUrl || "https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp"}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover select-none"
                      draggable={false}
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp" }}
                    />
                    <div className="min-w-0">
                      <h1 className="text-[16px] font-semibold tracking-tight text-[#f7f8f8] flex items-center gap-1.5">
                        Drop a file for {ownerName}
                        {meta.owner.verified && <MIcon name="verified" size={16} className="text-[#3b82f6]" />}
                      </h1>
                      <p className="text-[12px] text-[#898e97]">Encrypted in your browser · up to {fmtBytes(meta.maxUploadSize)}</p>
                    </div>
                  </div>

                  <div className="px-3 pb-3">
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="w-full flex flex-col items-center justify-center gap-2 rounded-[6px] border border-dashed border-[rgba(255,255,255,0.14)] hover:border-[rgba(255,255,255,0.28)] bg-[rgba(255,255,255,0.02)] transition-colors py-8 cursor-pointer"
                    >
                      <MIcon name={file ? "description" : "upload_file"} size={26} className="text-[#898e97]" />
                      <span className="text-[13px] text-[#f7f8f8] font-medium px-4 truncate max-w-full">
                        {file ? file.name : "Choose a file"}
                      </span>
                      {file && <span className="text-[12px] text-[#898e97]">{fmtBytes(file.size)}</span>}
                    </button>
                    <input
                      ref={inputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => selectFile(e.target.files?.[0] || null)}
                    />

                    {fileError && <p className="mt-2 text-[12px] text-red-400">{fileError}</p>}
                    {sendError && <p className="mt-2 text-[12px] text-red-400">{sendError}</p>}

                    {file && !isDev && (
                      <div className="mt-3 flex justify-center">
                        <Turnstile
                          sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                          onVerify={(token) => setTurnstileToken(token)}
                          onExpire={() => setTurnstileToken("")}
                          theme="dark"
                        />
                      </div>
                    )}

                    <Button
                      onClick={handleSend}
                      variant="landing-primary"
                      className="mt-3 w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!canSend}
                    >
                      <MIcon name="send" size={16} />
                      Send file
                    </Button>
                  </div>
                </>
              )}
            </div>

            {!busy && !done && (
              <p className="mt-4 text-center text-[11px] text-[#5c6169] leading-relaxed">
                Your file is encrypted on your device before it's sent. Only {ownerName} can open it.
              </p>
            )}
          </motion.div>
        )}
      </div>
    </main>
  )
}
