"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { useManage } from "@/hooks/useManage"
import { hypaToast, hypaError, hypaConfirm } from "@/components/ui/hypa-notif"
import { getSessionKey } from "@/lib/security/cryptoClient"
import { generateWrappedFunnelKeypair } from "@/lib/security/funnelCrypto"
import { unwrapFunnelFileKey, decryptFunnelName, downloadAndDecryptFunnelFile } from "@/components/funnel/download"
import { apiFetch } from "@/lib/http/fetch"
import { isPaidTier, normalizeTier } from "@/constants/tier-limits"

interface FunnelLink { id: string; slug: string; createdAt: string }
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
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

async function getCsrf(): Promise<string> {
  const res = await apiFetch("/api/v2/csrf")
  const data = await res.json()
  return data.token || ""
}

export default function FunnelInboxPage() {
  const { user } = useManage()
  const paid = user ? isPaidTier(normalizeTier(user.tier)) : false

  const [links, setLinks] = useState<FunnelLink[]>([])
  const [files, setFiles] = useState<FunnelFileDto[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [customSlug, setCustomSlug] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

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
      setLinks(data.funnels || [])
      setFiles(nextFiles)

      if (seenIds.current === null) {
        seenIds.current = new Set(nextFiles.map((f) => f.id))
      } else {
        if (notify) {
          const fresh = nextFiles.filter((f) => !seenIds.current!.has(f.id))
          fresh.forEach(() => hypaToast({ title: "New file received", description: "A file just landed in your funnel inbox." }))
        }
        // Always reconcile to the latest set so deletions and non-notify reloads
        // can't trigger a spurious toast on the next poll.
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

  const funnelUrl = (slug: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/funnel/${slug}` : `/funnel/${slug}`

  const createFunnel = async () => {
    if (creating) return
    setCreating(true)
    try {
      const master = await getSessionKey()
      if (!master) { hypaError("Please sign in again to create a funnel."); return }

      const { publicKey, wrappedPrivateKey } = await generateWrappedFunnelKeypair(master)
      const csrfToken = await getCsrf()

      const res = await apiFetch("/api/v2/funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csrfToken, publicKey, wrappedPrivateKey, customSlug: customSlug.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { hypaError(data.message || "Couldn't create the funnel."); return }

      setCustomSlug("")
      try { await navigator.clipboard.writeText(funnelUrl(data.slug)) } catch {}
      hypaToast({ title: "Funnel created", description: "The drop link is copied to your clipboard." })
      await load(false)
    } catch {
      hypaError("Couldn't create the funnel. Please try again.")
    } finally {
      setCreating(false)
    }
  }

  const copyLink = async (slug: string) => {
    try { await navigator.clipboard.writeText(funnelUrl(slug)); hypaToast({ title: "Link copied", durationMs: 2500 }) }
    catch { hypaError("Couldn't copy the link.") }
  }

  const deleteLink = async (slug: string) => {
    const ok = await hypaConfirm({ title: "Delete this funnel link?", description: "The link will stop working immediately.", confirmText: "Delete", destructive: true })
    if (!ok) return
    setBusyId(slug)
    try {
      const res = await apiFetch(`/api/v2/funnel/${slug}`, { method: "DELETE" })
      if (!res.ok) { hypaError("Couldn't delete the link."); return }
      await load(false)
    } finally { setBusyId(null) }
  }

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
        <div className="mb-6">
          <h1 className="text-[28px] font-medium tracking-tight text-[#171717] dark:text-[#e3e3e3]">Funnel</h1>
        </div>

        <div className="rounded-[10px] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] bg-white dark:bg-[#0a0b0c] p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center flex-1 rounded-[8px] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] bg-[#f7f7f7] dark:bg-[rgba(255,255,255,0.02)] px-3">
              <span className="text-[13px] text-[#999] dark:text-[#6b7075] shrink-0">/funnel/</span>
              <input
                value={customSlug}
                onChange={(e) => setCustomSlug(e.target.value)}
                placeholder="custom-link (optional)"
                className="flex-1 bg-transparent outline-none text-[13px] text-[#171717] dark:text-[#e3e3e3] py-2.5 px-1"
              />
            </div>
            <button
              type="button"
              onClick={createFunnel}
              disabled={creating}
              className="inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-[8px] bg-[#151616] text-[#f7f8f8] text-[14px] font-medium disabled:opacity-60 active:scale-[0.98] transition-transform"
            >
              {creating ? <LoadingSvg variant="white" size={16} /> : <MIcon name="add_link" size={18} />}
              Create funnel
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <LoadingSvg size={28} />
          </div>
        ) : (
          <div className="space-y-8">
            {links.length > 0 && (
            <section>
              <h2 className="text-[13px] font-semibold text-[#666] dark:text-[#898e97] uppercase tracking-wide mb-2">Active links</h2>
              <div className="space-y-2">
                {links.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 rounded-[8px] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] bg-white dark:bg-[#0a0b0c] px-3 py-2.5">
                    <MIcon name="link" size={18} className="text-[#999] dark:text-[#898e97] shrink-0" />
                    <span className="flex-1 truncate text-[13px] text-[#171717] dark:text-[#e3e3e3]">/funnel/{l.slug}</span>
                    <span className="hidden sm:block text-[12px] text-[#999] dark:text-[#6b7075]">{fmtDate(l.createdAt)}</span>
                    <button type="button" onClick={() => copyLink(l.slug)} className="p-1.5 rounded-md hover:bg-[#f0f0f0] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors" title="Copy link">
                      <MIcon name="content_copy" size={16} className="text-[#666] dark:text-[#898e97]" />
                    </button>
                    <button type="button" onClick={() => deleteLink(l.slug)} disabled={busyId === l.slug} className="p-1.5 rounded-md hover:bg-[rgba(239,68,68,0.1)] transition-colors disabled:opacity-50" title="Delete link">
                      <MIcon name="delete" size={16} className="text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-[13px] font-semibold text-[#666] dark:text-[#898e97] uppercase tracking-wide mb-2">Received files</h2>
            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16">
                <MIcon name="inbox" size={30} className="text-[#ccc] dark:text-[#3a3f45]" />
                <p className="mt-3 text-[14px] font-medium text-[#171717] dark:text-[#e3e3e3]">No files yet</p>
                <p className="mt-1 text-[13px] text-[#666] dark:text-[#898e97]">Files dropped through your funnel links show up here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((f) => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 rounded-[8px] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] bg-white dark:bg-[#0a0b0c] px-3 py-2.5"
                  >
                    <MIcon name="description" size={20} className="text-[#666] dark:text-[#898e97] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#171717] dark:text-[#e3e3e3]">{names[f.id] || "Decrypting…"}</p>
                      <p className="text-[12px] text-[#999] dark:text-[#6b7075]">{fmtBytes(f.fileSize)} · {fmtDate(f.createdAt)}</p>
                    </div>
                    <button type="button" onClick={() => downloadFile(f)} disabled={busyId === f.id} className="p-1.5 rounded-md hover:bg-[#f0f0f0] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors disabled:opacity-50" title="Download">
                      {busyId === f.id ? <LoadingSvg size={16} /> : <MIcon name="download" size={18} className="text-[#666] dark:text-[#898e97]" />}
                    </button>
                    <button type="button" onClick={() => deleteFile(f)} disabled={busyId === f.id} className="p-1.5 rounded-md hover:bg-[rgba(239,68,68,0.1)] transition-colors disabled:opacity-50" title="Delete">
                      <MIcon name="delete" size={16} className="text-red-500" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </div>
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
    </div>
  )
}
