"use client"

import { useEffect, useRef, useState, use } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import Turnstile from "react-turnstile"
import { MIcon } from "@/components/ui/material-icon"
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
  const [dragOver, setDragOver] = useState(false)
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
      await dropFile({ slug, file, publicKeySpki: meta.publicKey, csrfToken, turnstileToken, onState: setDropState })
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
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans bg-[#08090a] text-[#f7f8f8]">
      <div className="relative w-full max-w-[440px]">
        <div className="flex justify-center mb-8">
          <Link href="/" className="hover:opacity-80 transition-opacity active:scale-[0.97]">
            <img src="https://r2.hypastack.com/cdn/lvko6iovrtq7/footer.webp" className="select-none h-12 w-12 rounded-md object-contain" alt="Hypastack" draggable={false} />
          </Link>
        </div>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center py-24">
            <LoadingSvg variant="white" size={32} />
          </motion.div>
        )}

        {!loading && closed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-[#0a0b0c] border border-[rgba(255,255,255,0.08)] rounded-[14px] p-7 text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[rgba(255,255,255,0.05)] mx-auto mb-4">
                <MIcon name="lock" className="text-[#898e97]" size={24} />
              </div>
              <h2 className="text-[19px] font-semibold tracking-tight">Funnel closed</h2>
              <p className="text-[13px] text-[#898e97] mt-2 mb-6 leading-relaxed">
                This drop link has already been used or doesn&apos;t exist. Funnel links work exactly once.
              </p>
              <Link href="/" className="inline-flex items-center justify-center h-[42px] px-6 rounded-full bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.08)] text-[14px] font-medium transition-colors">
                Go home
              </Link>
            </div>
          </motion.div>
        )}

        {!loading && meta && !closed && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
            <div className="bg-[#0a0b0c] border border-[rgba(255,255,255,0.08)] rounded-[16px] overflow-hidden">
              <AnimatePresence mode="wait">
                {busy ? (
                  <motion.div key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-center px-6 py-16">
                    <div className="relative flex items-center justify-center">
                      <motion.div
                        className="absolute h-20 w-20 rounded-full border border-[rgba(255,255,255,0.08)]"
                        animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <LoadingSvg variant="white" size={40} />
                    </div>
                    <p className="mt-7 text-[16px] font-semibold">We&apos;ve got you.</p>
                    <p className="mt-1.5 text-[13px] text-[#898e97] leading-relaxed max-w-[290px]">
                      Sit back and relax while your file is encrypted and sent. Larger files take a little longer — no need to wait around.
                    </p>
                  </motion.div>
                ) : done ? (
                  <motion.div key="done" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center text-center px-6 py-16">
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}
                      className="flex items-center justify-center h-16 w-16 rounded-full bg-[rgba(34,197,94,0.12)] mb-5"
                    >
                      <MIcon name="check" className="text-green-500" size={32} />
                    </motion.div>
                    <p className="text-[18px] font-semibold tracking-tight">Sent</p>
                    <p className="mt-1.5 text-[13px] text-[#898e97] leading-relaxed max-w-[290px]">
                      Your file is on its way to {ownerName}. This link is now closed.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex items-center gap-3 p-5 pb-4 border-b border-[rgba(255,255,255,0.06)]">
                      <div className="p-[2px] rounded-full bg-gradient-to-tr from-[rgba(255,255,255,0.06)] to-[rgba(255,255,255,0.18)] shrink-0">
                        <img
                          src={meta.owner.avatarUrl || "https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp"}
                          alt=""
                          className="h-11 w-11 rounded-full object-cover block select-none"
                          draggable={false}
                          onError={(e) => { (e.target as HTMLImageElement).src = "https://r2.hypastack.com/cdn/564y1z5zojge/no-pfp.webp" }}
                        />
                      </div>
                      <div className="min-w-0">
                        <h1 className="text-[16px] font-semibold tracking-tight flex items-center gap-1.5">
                          Send a file to {ownerName}
                          {meta.owner.verified && <MIcon name="verified" size={16} className="text-[#3b82f6]" />}
                        </h1>
                        <p className="text-[12px] text-[#898e97] mt-0.5">Encrypted in your browser · up to {fmtBytes(meta.maxUploadSize)}</p>
                      </div>
                    </div>

                    <div className="p-4">
                      {!file ? (
                        <button
                          type="button"
                          onClick={() => inputRef.current?.click()}
                          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={(e) => { e.preventDefault(); setDragOver(false); selectFile(e.dataTransfer.files?.[0] || null) }}
                          className={`w-full flex flex-col items-center justify-center gap-2.5 rounded-[12px] border border-dashed py-11 transition-colors cursor-pointer ${
                            dragOver ? "border-[rgba(255,255,255,0.4)] bg-[rgba(255,255,255,0.04)]" : "border-[rgba(255,255,255,0.14)] hover:border-[rgba(255,255,255,0.28)] hover:bg-[rgba(255,255,255,0.02)]"
                          }`}
                        >
                          <div className="flex items-center justify-center h-11 w-11 rounded-full bg-[rgba(255,255,255,0.05)]">
                            <MIcon name="upload_file" size={22} className="text-[#c7c9cc]" />
                          </div>
                          <span className="text-[14px] font-medium">Drop a file or click to choose</span>
                          <span className="text-[12px] text-[#6b7075]">One file, sent privately</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3">
                          <div className="flex items-center justify-center h-10 w-10 rounded-[10px] bg-[rgba(255,255,255,0.05)] shrink-0">
                            <MIcon name="description" size={20} className="text-[#c7c9cc]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-[13px] font-medium">{file.name}</p>
                            <p className="text-[12px] text-[#6b7075]">{fmtBytes(file.size)}</p>
                          </div>
                          <button type="button" onClick={() => selectFile(null)} className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.06)] transition-colors shrink-0" aria-label="Remove file">
                            <MIcon name="close" size={16} className="text-[#898e97]" />
                          </button>
                        </div>
                      )}

                      <input ref={inputRef} type="file" className="hidden" onChange={(e) => selectFile(e.target.files?.[0] || null)} />

                      {fileError && <p className="mt-2.5 text-[12px] text-red-400">{fileError}</p>}
                      {sendError && <p className="mt-2.5 text-[12px] text-red-400">{sendError}</p>}

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

                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={!canSend}
                        className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150 w-full mt-3 disabled:opacity-45 disabled:cursor-not-allowed"
                      >
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#242526] via-[#242526] to-[#666c73] group-hover:to-[#888f98] transition-colors duration-300" />
                        <div className="relative bg-[#151616] rounded-full h-[46px] w-full flex items-center justify-center gap-2 text-[15px] font-medium">
                          <MIcon name="send" size={17} />
                          Send file
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {!busy && !done && (
              <p className="mt-4 text-center text-[11px] text-[#5c6169] leading-relaxed flex items-center justify-center gap-1.5">
                <MIcon name="lock" size={12} className="opacity-70" />
                Encrypted on your device. Only {ownerName} can open it.
              </p>
            )}
          </motion.div>
        )}
      </div>
    </main>
  )
}
