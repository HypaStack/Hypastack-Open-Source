"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { useManage } from "@/hooks/useManage"
import { hypaToast, hypaError, hypaConfirm } from "@/components/ui/hypa-notif"
import { getSessionKey } from "@/lib/security/cryptoClient"
import { unwrapFunnelFileKey, decryptFunnelName, downloadAndDecryptFunnelFile } from "@/components/funnel/download"
import { FunnelCreateTray } from "@/components/funnel/create-tray"
import { apiFetch } from "@/lib/http/fetch"
import { isPaidTier, normalizeTier } from "@/constants/tier-limits"

interface FunnelFileDto {
  id: string
  nameEncrypted: string
  wrappedKey: string
  wrappedPrivateKey: string
  fileSize: number
  contentType: string
  chunkSize: number | null
  totalParts: number | null
  createdAt: string
}

function fmtBytes(bytes: number): string {
  if (!bytes) return "0 B"
  const k = 1024, s = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + s[i]
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function extOf(name: string): string {
  return name.includes(".") ? name.split(".").pop()!.slice(0, 5).toUpperCase() : "FILE"
}

const gridVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const gridItemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
}

export default function FunnelInboxPage() {
  const { user } = useManage()
  const paid = user ? isPaidTier(normalizeTier(user.tier)) : false

  const [files, setFiles] = useState<FunnelFileDto[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [trayOpen, setTrayOpen] = useState(false)

  const seenIds = useRef<Set<string> | null>(null)

  const decryptNames = useCallback(async (fileList: FunnelFileDto[]) => {
    const master = await getSessionKey()
    if (!master) return
    const next: Record<string, string> = {}
    await Promise.all(
      fileList.map(async (f) => {
        try {
          const key = await unwrapFunnelFileKey(f.wrappedPrivateKey, f.wrappedKey, master)
          next[f.id] = await decryptFunnelName(f.nameEncrypted, key)
        } catch {
          next[f.id] = "Encrypted file"
        }
      })
    )
    setNames((prev) => ({ ...prev, ...next }))
  }, [])

  const load = useCallback(async (notify: boolean) => {
    try {
      const res = await apiFetch("/api/v2/funnel")
      if (!res.ok) return
      const data = await res.json()
      const nextFiles: FunnelFileDto[] = data.files || []
      setFiles(nextFiles)

      if (seenIds.current === null) {
        seenIds.current = new Set(nextFiles.map((f) => f.id))
      } else {
        if (notify) {
          const fresh = nextFiles.filter((f) => !seenIds.current!.has(f.id))
          fresh.forEach(() => hypaToast({ title: "New file received", description: "A file just landed in your funnel inbox." }))
        }
        seenIds.current = new Set(nextFiles.map((f) => f.id))
      }
      decryptNames(nextFiles)
    } finally {
      setLoading(false)
    }
  }, [decryptNames])

  useEffect(() => { load(false) }, [load])

  // Poll while the inbox is open so drops surface without a manual refresh.
  useEffect(() => {
    const t = setInterval(() => load(true), 15000)
    return () => clearInterval(t)
  }, [load])

  const downloadFile = async (f: FunnelFileDto) => {
    setBusyId(f.id)
    try {
      const master = await getSessionKey()
      if (!master) { hypaError("Please sign in again to open this file."); return }
      const aesKey = await unwrapFunnelFileKey(f.wrappedPrivateKey, f.wrappedKey, master)
      const res = await apiFetch(`/api/v2/funnel/files/${f.id}/download`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) { hypaError("Couldn't fetch this file."); return }
      await downloadAndDecryptFunnelFile({
        url: data.url,
        aesKey,
        fileName: names[f.id] || "download",
        contentType: f.contentType,
        chunkSize: f.chunkSize,
        totalParts: f.totalParts,
      })
    } catch {
      hypaError("Couldn't decrypt this file.")
    } finally { setBusyId(null) }
  }

  const deleteFile = async (f: FunnelFileDto) => {
    const ok = await hypaConfirm({ title: "Delete this file?", description: "This permanently removes the received file.", confirmText: "Delete", destructive: true })
    if (!ok) return
    setBusyId(f.id)
    try {
      const res = await apiFetch(`/api/v2/funnel/files/${f.id}`, { method: "DELETE" })
      if (!res.ok) { hypaError("Couldn't delete the file."); return }
      await load(false)
    } finally { setBusyId(null) }
  }

  return (
    <div className="flex-1 flex flex-col relative">
      <div className={paid ? "flex-1 flex flex-col" : "flex-1 flex flex-col blur-[3px] opacity-70 pointer-events-none select-none"}>
        <div className="flex items-center justify-between gap-4 mb-6 shrink-0">
          <h1 className="text-[28px] font-medium tracking-tight text-[#171717] dark:text-[#e3e3e3]">Funnel</h1>
          <button
            type="button"
            onClick={() => setTrayOpen(true)}
            className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150 shrink-0"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-[#242526] via-[#242526] to-[#666c73] group-hover:to-[#888f98] transition-colors duration-300" />
            <div className="relative bg-[#151616] rounded-full px-5 h-[40px] flex items-center justify-center gap-2 text-[#f7f8f8] text-[14px] font-medium">
              <MIcon name="add_link" size={17} />
              <span>Create funnel</span>
            </div>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <LoadingSvg size={28} />
          </div>
        ) : files.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
            <div className="flex items-center justify-center h-14 w-14 rounded-[16px] bg-[#f2f2f4] dark:bg-[rgba(255,255,255,0.03)] mb-4">
              <MIcon name="inbox" size={26} className="text-[#b5b5b5] dark:text-[#5c6169]" />
            </div>
            <h3 className="text-[16px] font-semibold text-[#171717] dark:text-[#e3e3e3]">No files yet</h3>
            <p className="mt-1 text-[13px] text-[#666] dark:text-[#898e97] max-w-[300px]">
              Create a funnel and share the link — files dropped through it show up here.
            </p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3"
            initial="hidden"
            animate="visible"
            variants={gridVariants}
          >
            {files.map((f) => {
              const busy = busyId === f.id
              const name = names[f.id]
              return (
                <motion.div key={f.id} variants={gridItemVariants} className="group relative">
                  <div className="relative w-full aspect-square rounded-[12px] overflow-hidden border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.06)] bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.02)] flex flex-col items-center justify-center">
                    <MIcon name="description" size={34} className="text-[#b5b5b5] dark:text-[#5c6169]" />
                    <span className="mt-2 text-[10px] font-semibold tracking-wider text-[#999] dark:text-[#6b7075] bg-[rgba(0,0,0,0.04)] dark:bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded-[5px]">
                      {name ? extOf(name) : "•••"}
                    </span>

                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => downloadFile(f)}
                        disabled={busy}
                        className="flex items-center justify-center h-9 w-9 rounded-full bg-white/95 text-[#151616] hover:bg-white active:scale-95 transition disabled:opacity-60"
                        title="Download"
                      >
                        {busy ? <LoadingSvg variant="dark" size={16} /> : <MIcon name="download" size={18} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteFile(f)}
                        disabled={busy}
                        className="flex items-center justify-center h-9 w-9 rounded-full bg-white/95 text-red-500 hover:bg-white active:scale-95 transition disabled:opacity-60"
                        title="Delete"
                      >
                        <MIcon name="delete" size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 px-0.5">
                    <p className="truncate text-[13px] font-medium text-[#171717] dark:text-[#e3e3e3]" title={name || ""}>{name || "Decrypting…"}</p>
                    <p className="text-[11px] text-[#999] dark:text-[#6b7075]">{fmtBytes(f.fileSize)} · {fmtDate(f.createdAt)}</p>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>

      {!paid && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="max-w-sm w-full rounded-[12px] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.1)] bg-white dark:bg-[#0a0b0c] p-6 text-center" style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.12)" }}>
            <MIcon name="forward_to_inbox" size={30} className="text-[#171717] dark:text-[#e3e3e3]" />
            <h3 className="mt-3 text-[17px] font-semibold text-[#171717] dark:text-[#e3e3e3] tracking-tight">Funnels are a paid feature</h3>
            <p className="mt-1.5 text-[13px] text-[#666] dark:text-[#898e97] leading-relaxed">
              Create one-time links and receive files straight to your inbox, encrypted so only you can open them. Available on the Essential plan and above.
            </p>
            <a href="/pricing" className="inline-block mt-4 text-[13px] font-medium underline text-[#171717] dark:text-[#f7f8f8]">See plans</a>
          </div>
        </div>
      )}

      <FunnelCreateTray open={trayOpen} onClose={() => setTrayOpen(false)} />
    </div>
  )
}
