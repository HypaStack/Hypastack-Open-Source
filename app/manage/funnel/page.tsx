"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { ShineButton } from "@/components/ui/shine-button"
import { AlertMessage } from "@/components/ui/alert-message"
import { useManage } from "@/hooks/useManage"
import { hypaToast, hypaError, hypaConfirm } from "@/components/ui/hypa-notif"
import { getSessionKey } from "@/lib/security/cryptoClient"
import { unwrapFunnelFileKey, decryptFunnelName, downloadAndDecryptFunnelFile } from "@/components/funnel/download"
import { FunnelCreateTray } from "@/components/funnel/create-tray"
import { apiFetch } from "@/lib/http/fetch"
import { isPaidTier, normalizeTier } from "@/constants/tier-limits"
import { gridVariants } from "../cdn/_helpers"
import { FunnelFileTile, type FunnelFileDto } from "./_file-tile"

export default function FunnelInboxPage() {
  const { user } = useManage()
  const paid = user ? isPaidTier(normalizeTier(user.tier)) : false

  const [files, setFiles] = useState<FunnelFileDto[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [trayOpen, setTrayOpen] = useState(false)

  const seenIds = useRef<Set<string> | null>(null)
  const dragModeRef = useRef<"select" | "deselect" | null>(null)

  useEffect(() => {
    const clear = () => { dragModeRef.current = null }
    window.addEventListener("mouseup", clear)
    return () => window.removeEventListener("mouseup", clear)
  }, [])

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

  const toggleSelect = (id: string, forceMode?: "select" | "deselect") => {
    setSelected((prev) => {
      const isSelected = prev.has(id)
      if (forceMode === "select" && isSelected) return prev
      if (forceMode === "deselect" && !isSelected) return prev
      const next = new Set(prev)
      if (forceMode === "select" || (!forceMode && !isSelected)) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const allSelected = files.length > 0 && files.every((f) => selected.has(f.id))

  const handleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(files.map((f) => f.id)))
  }

  const handleDownload = async () => {
    setWorking(true)
    try {
      const master = await getSessionKey()
      if (!master) { hypaError("Please sign in again to open these files."); return }
      for (const f of files.filter((f) => selected.has(f.id))) {
        try {
          const aesKey = await unwrapFunnelFileKey(f.wrappedPrivateKey, f.wrappedKey, master)
          const res = await apiFetch(`/api/v2/funnel/files/${f.id}/download`)
          const data = await res.json().catch(() => ({}))
          if (!res.ok || !data.url) { hypaError("Couldn't fetch this file."); continue }
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
        }
      }
    } finally { setWorking(false) }
  }

  const handleDelete = async () => {
    const count = selected.size
    const ok = await hypaConfirm({
      title: count > 1 ? `Delete ${count} files?` : "Delete this file?",
      description: "This permanently removes the received files.",
      confirmText: "Delete",
      destructive: true,
    })
    if (!ok) return
    setWorking(true)
    try {
      for (const id of Array.from(selected)) {
        const res = await apiFetch(`/api/v2/funnel/files/${id}`, { method: "DELETE" })
        if (!res.ok) hypaError("Couldn't delete the file.")
      }
      setSelected(new Set())
      await load(false)
    } finally { setWorking(false) }
  }

  if (!paid) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-[440px]">
          <h1 className="text-[28px] font-medium tracking-tight text-[#171717] dark:text-[#e3e3e3]">Funnel</h1>
          <p className="mt-2 text-[13px] text-[#666] dark:text-[#898e97] leading-relaxed">
            Create one-time links and receive files straight to your inbox, encrypted so only you can open them.
          </p>
          <AlertMessage tone="info" className="mt-5" style={{ marginBottom: 0, fontSize: 13, lineHeight: "20px" }}>
            Funnels are available on the Essential, Pro and Max plans.
          </AlertMessage>
          <div className="mt-5">
            <ShineButton href="/pricing" size="md" aria-label="See plans">
              See plans
            </ShineButton>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-6 shrink-0">
        <h1 className="text-[28px] font-medium tracking-tight text-[#171717] dark:text-[#e3e3e3] flex items-center gap-2 whitespace-nowrap">
          <span className="text-[#333] dark:text-[#ccc]">Funnel</span>
        </h1>

        <motion.div layout className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {selected.size > 0 ? (
            <>
              <motion.div layout>
                <SecondaryButton size="md" onClick={handleSelectAll} style={{ gap: 8 }}>
                  <MIcon name={allSelected ? "deselect" : "select_all"} size={15} className="shrink-0" />
                  <span className="hidden sm:inline">{allSelected ? "Deselect all" : "Select all"}</span>
                </SecondaryButton>
              </motion.div>
              <motion.div layout>
                <SecondaryButton size="md" onClick={handleDownload} disabled={working} style={{ gap: 8 }}>
                  {working ? (
                    <LoadingSvg size={16} className="shrink-0" />
                  ) : (
                    <MIcon name="download" size={15} className="shrink-0" />
                  )}
                  <span className="hidden sm:inline">
                    Download{selected.size > 1 ? ` (${selected.size})` : ""}
                  </span>
                </SecondaryButton>
              </motion.div>
              <motion.div layout>
                <ShineButton
                  size="md"
                  onClick={handleDelete}
                  disabled={working}
                  color="#dc2626"
                  hoverColor="#b91c1c"
                  style={{ gap: 8 }}
                >
                  <MIcon name="delete" size={16} className="shrink-0" />
                  Delete {selected.size}
                </ShineButton>
              </motion.div>
            </>
          ) : (
            <>
              <AnimatePresence mode="popLayout">
                {files.length > 0 && (
                  <motion.div key="select-all" layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ duration: 0.18 }}>
                    <SecondaryButton size="md" onClick={handleSelectAll} style={{ gap: 8 }}>
                      <MIcon name="select_all" size={15} className="shrink-0" />
                      <span className="hidden sm:inline">Select all</span>
                    </SecondaryButton>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.div layout>
                <SecondaryButton size="md" onClick={() => setTrayOpen(true)} style={{ gap: 8 }}>
                  <MIcon name="add_link" size={15} className="shrink-0" />
                  <span>Create funnel</span>
                </SecondaryButton>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <LoadingSvg size={28} />
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center min-h-[60vh] h-full">
          <MIcon name="inbox" size={40} style={{ color: "#555", marginBottom: 12 }} />
          <p style={{ fontSize: 15, color: "#a1a1aa", marginBottom: 16 }}>No files yet</p>
          <SecondaryButton size="md" onClick={() => setTrayOpen(true)} style={{ gap: 8 }}>
            <MIcon name="add_link" size={14} />
            Create funnel
          </SecondaryButton>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3"
          initial="hidden"
          animate="visible"
          variants={gridVariants}
        >
          {files.map((f) => (
            <FunnelFileTile
              key={f.id}
              file={f}
              name={names[f.id]}
              selected={selected.has(f.id)}
              onToggleSelect={() => toggleSelect(f.id)}
              onDragAction={(action) => {
                if (action === "start") {
                  const mode = selected.has(f.id) ? "deselect" : "select"
                  dragModeRef.current = mode
                  toggleSelect(f.id, mode)
                } else if (action === "enter") {
                  if (dragModeRef.current) toggleSelect(f.id, dragModeRef.current)
                }
              }}
            />
          ))}
        </motion.div>
      )}

      <FunnelCreateTray open={trayOpen} onClose={() => setTrayOpen(false)} />
    </div>
  )
}
