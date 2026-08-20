"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { Button } from "@heroui/react"
import { ButtonLink } from "@/components/ui/button-link"
import { AlertMessage } from "@/components/ui/alert-message"
import { useManage } from "@/hooks/useManage"
import { hypaToast, hypaError, hypaConfirm } from "@/components/ui/hypa-notif"
import { getSessionKey } from "@/lib/security/cryptoClient"
import { unwrapFunnelFileKey, decryptFunnelName, downloadAndDecryptFunnelFile } from "@/components/funnel/download"
import { FunnelCreateTray } from "@/components/funnel/create-tray"
import { apiFetch } from "@/lib/http/fetch"
import { isPaidTier, normalizeTier } from "@/constants/tier-limits"
import { FunnelFileTable, type FunnelFileDto } from "./_file-table"

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
          fresh.forEach(() => hypaToast({ title: "New file received", description: "A file just landed in your requests inbox." }))
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
    // Deleting runs inside onConfirm so the spinner lives on the dialog's own
    // Delete button, not on the page behind it.
    await hypaConfirm({
      title: count > 1 ? `Delete ${count} files?` : "Delete this file?",
      description: "This permanently removes the received files.",
      confirmText: "Delete",
      destructive: true,
      onConfirm: async () => {
        for (const id of Array.from(selected)) {
          const res = await apiFetch(`/api/v2/funnel/files/${id}`, { method: "DELETE" })
          if (!res.ok) throw new Error("Couldn't delete the file.")
        }
        setSelected(new Set())
        await load(false)
      },
    })
  }

  if (!paid) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-[440px]">
          <h1 className="text-[28px] font-medium tracking-tight text-[#171717] dark:text-[#e3e3e3]">Requests</h1>
          <p className="mt-2 text-[13px] text-[#666] dark:text-[#898e97] leading-relaxed">
            Create one-time links and receive files straight to your inbox, encrypted so only you can open them.
          </p>
          <AlertMessage tone="info" className="mt-5" style={{ marginBottom: 0, fontSize: 13, lineHeight: "20px" }}>
            Requests are available on the Plus, Pro and Max plans.
          </AlertMessage>
          <div className="mt-5">
            <ButtonLink href="/pricing" variant="primary" size="md" aria-label="See plans">
              See plans
            </ButtonLink>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-2 shrink-0">
        <h1 className="text-[28px] font-medium tracking-tight text-[#171717] dark:text-[#e3e3e3] flex items-center gap-2 whitespace-nowrap">
          <span className="text-[#333] dark:text-[#ccc]">Requests</span>
        </h1>

        <motion.div layout className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {selected.size > 0 ? (
            <>
              <motion.div layout>
                <Button variant="tertiary" size="md" onPress={handleSelectAll} style={{ gap: 8 }}>
                  <MIcon name={allSelected ? "deselect" : "select_all"} size={15} className="shrink-0" />
                  <span className="hidden sm:inline">{allSelected ? "Deselect all" : "Select all"}</span>
                </Button>
              </motion.div>
              <motion.div layout>
                <Button variant="tertiary" size="md" onPress={handleDownload} isDisabled={working} style={{ gap: 8 }}>
                  {working ? (
                    <LoadingSvg size={16} className="shrink-0" />
                  ) : (
                    <MIcon name="download" size={15} className="shrink-0" />
                  )}
                  <span className="hidden sm:inline">
                    Download{selected.size > 1 ? ` (${selected.size})` : ""}
                  </span>
                </Button>
              </motion.div>
              <motion.div layout>
                <Button
                  variant="danger"
                  size="md"
                  onPress={handleDelete}
                  isDisabled={working}
                  style={{ gap: 8 }}
                >
                  <MIcon name="delete" size={16} className="shrink-0" />
                  Delete {selected.size}
                </Button>
              </motion.div>
            </>
          ) : (
            <>
              <AnimatePresence mode="popLayout">
                {files.length > 0 && (
                  <motion.div key="select-all" layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ duration: 0.18 }}>
                    <Button variant="tertiary" size="md" onPress={handleSelectAll} style={{ gap: 8 }}>
                      <MIcon name="select_all" size={15} className="shrink-0" />
                      <span className="hidden sm:inline">Select all</span>
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.div layout>
                <Button variant="tertiary" size="md" onPress={() => setTrayOpen(true)} style={{ gap: 8 }}>
                  <MIcon name="add_link" size={15} className="shrink-0" />
                  <span>Create request</span>
                </Button>
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
          <Button variant="tertiary" size="md" onPress={() => setTrayOpen(true)} style={{ gap: 8 }}>
            <MIcon name="add_link" size={14} />
            Create request
          </Button>
        </div>
      ) : (
        <FunnelFileTable
          files={files}
          names={names}
          selectedIds={selected}
          onSelectionChange={setSelected}
        />
      )}

      <FunnelCreateTray open={trayOpen} onClose={() => setTrayOpen(false)} />
    </div>
  )
}
