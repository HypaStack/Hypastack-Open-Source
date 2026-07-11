"use client"

import { hypaConfirm, hypaPrompt, hypaError } from "@/components/ui/hypa-notif"
import { MIcon } from "@/components/ui/material-icon"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { Loader } from "@/components/ui/loader"
import { ShineButton } from "@/components/ui/shine-button"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { Checkmark } from "@/components/ui/checkmark"
import { Walkthrough } from "@/components/ui/walkthrough"
import { UploadZone } from "@/components/upload"
import { useManage } from "@/hooks/useManage"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { ContextMenu, ContextMenuItem, ContextMenuDivider } from "@/components/ui/context-menu"
import { apiFetch } from "@/lib/http/fetch"

interface CdnAsset {
  id: string
  name: string
  size: number
  contentType: string
  cdnUrl: string
  folderId: string | null
  createdAt: string
}

interface CdnFolder {
  id: string
  name: string
  parentId: string | null
  createdAt: string
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const gridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const gridItemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith("image/")) {
    return <MIcon name="image" size={20} className="text-zinc-500" />
  }
  return <MIcon name="description" size={20} className="text-muted-foreground" />
}

export default function CdnPage() {
  const { user, cdnAssets: assets, setCdnAssets: setAssets, cdnFolders: folders, setCdnFolders: setFolders, refreshUser } = useManage()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copiedSelection, setCopiedSelection] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set())
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [hideCtrlHint, setHideCtrlHint] = useState(true)

  useEffect(() => {
    setHideCtrlHint(localStorage.getItem('hideCtrlHint') === '1')
  }, [])

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)

  // Upload state
  const [uploadOpen, setUploadOpen] = useState(false)
  const [pendingUploadFiles, setPendingUploadFiles] = useState<FileList | null>(null)
  const [wtStep, setWtStep] = useState(0)
  const [swapLoading, setSwapLoading] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const swapInputRef = useRef<HTMLInputElement>(null)
  const swapTargetRef = useRef<CdnAsset | null>(null)
  const dragModeRef = useRef<'select' | 'deselect' | null>(null)

  useEffect(() => {
    const handleMouseUp = () => { dragModeRef.current = null }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

  // Reset page when navigating folders
  useEffect(() => {
    setCurrentPage(1)
    setSelectedAssets(new Set())
  }, [currentFolderId])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files
    if (!rawFiles || rawFiles.length === 0) return
    const dt = new DataTransfer()
    for (let i = 0; i < rawFiles.length; i++) dt.items.add(rawFiles[i])
    setPendingUploadFiles(dt.files)
    setUploadOpen(true)
    setWtStep(s => s === 0 ? 1 : s)
    e.target.value = ""
  }, [])

  const handleUploadComplete = (newAsset: any) => {
    if (newAsset) {
      setAssets((prev) => [newAsset, ...prev])
    }
    refreshUser()
    setWtStep(s => s === 1 ? 2 : s)
  }

  const handleUploadStateChange = useCallback((uploadState: string) => {
    if (uploadState === "copied") {
      setWtStep(s => s === 2 ? 3 : s)
    }
  }, [])

  // --- Folder helpers ---
  const getBreadcrumbs = () => {
    const crumbs: CdnFolder[] = []
    let id = currentFolderId
    while (id) {
      const folder = folders.find(f => f.id === id)
      if (!folder) break
      crumbs.unshift(folder)
      id = folder.parentId
    }
    return crumbs
  }

  const handleCreateFolder = async () => {
    const name = await hypaPrompt({
      title: "New Folder",
      inputPlaceholder: "Folder name...",
      confirmText: "Create",
      cancelText: "Cancel",
    })
    if (!name) return
    try {
      const res = await apiFetch("/api/v2/cdn/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId: currentFolderId })
      })
      if (res.ok) {
        const data = await res.json()
        setFolders(prev => [...prev, data.folder])
      }
    } catch (err) {
      console.error("Failed to create CDN folder:", err)
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId)
    await hypaConfirm({
      title: `Delete folder "${folder?.name || "Unknown"}" and all its contents?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        const res = await apiFetch("/api/v2/cdn/folders", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId }),
        })
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message || "Failed to delete folder")
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        const deletedAssetIds = new Set<string>()
        let deletedFolderIds: string[] = []
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""
          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const data = JSON.parse(line)
              if (data.done) deletedFolderIds = data.deletedFolderIds || []
              else if (data.success && data.id) deletedAssetIds.add(data.id)
            } catch { /* malformed line */ }
          }
        }
        const folderIdSet = new Set(deletedFolderIds.length > 0 ? deletedFolderIds : [folderId])
        setFolders(prev => prev.filter(f => !folderIdSet.has(f.id)))
        setAssets(prev => prev.filter(a => !deletedAssetIds.has(a.id) && (!a.folderId || !folderIdSet.has(a.folderId))))
        if (currentFolderId && folderIdSet.has(currentFolderId)) {
          setCurrentFolderId(folder?.parentId || null)
        }
      },
    })
  }

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return true
      }
    } catch {
      // fall through to legacy path
    }
    try {
      const ta = document.createElement("textarea")
      ta.value = text
      ta.setAttribute("readonly", "")
      ta.style.position = "fixed"
      ta.style.top = "0"
      ta.style.left = "0"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      const ok = document.execCommand("copy")
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }

  const handleCopy = async (url: string, id: string) => {
    const ok = await copyToClipboard(url)
    if (!ok) return
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    setWtStep(s => s === 2 ? 3 : s)
  }

  const handleDelete = async (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId)
    await hypaConfirm({
      title: "Are you sure you want to delete this asset forever?",
      items: asset ? [asset.name] : [],
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        const res = await apiFetch("/api/v2/cdn/assets", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetId }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message || "Failed to delete")
        }
        setAssets((prev) => prev.filter((a) => a.id !== assetId))
        setWtStep(s => s === 4 ? 5 : s)
        setSelectedAssets((prev) => {
          const next = new Set(prev)
          next.delete(assetId)
          return next
        })
      },
    })
  }

  // ── Hot Swap ──
  const handleHotSwapAsset = (asset: CdnAsset) => {
    swapTargetRef.current = asset
    swapInputRef.current?.click()
  }

  const handleHotSwapClick = () => {
    const ids = Array.from(selectedAssets)
    if (ids.length !== 1) return
    const asset = assets.find(a => a.id === ids[0])
    if (!asset) return
    swapTargetRef.current = asset
    swapInputRef.current?.click()
  }

  const handleHotSwapFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    const target = swapTargetRef.current
    if (!file || !target) return

    // Confirm via hypaConfirm notif (bottom-right)
    const confirmed = await hypaConfirm({
      title: "Hot swap",
      description: `Replace the file behind this CDN link. Your file will be automatically renamed to "${target.name}" — the URL stays the same.`,
      confirmText: "Just swap it",
      cancelText: "Cancel",
    })
    if (!confirmed) {
      swapTargetRef.current = null
      return
    }

    setSwapLoading(target.id)

    try {
      // 1. Get CSRF token
      const csrfRes = await apiFetch("/api/v2/csrf")
      const csrfData = await csrfRes.json()
      const csrfToken = csrfData.token
      if (!csrfToken) throw new Error("Failed to get CSRF token")

      // 2. Init hot swap — server returns presigned PUT for the existing R2 key
      const initRes = await apiFetch("/api/v2/cdn/hot-swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: target.id,
          fileSize: file.size,
          contentType: file.type || "application/octet-stream",
          csrfToken,
        }),
      })

      if (!initRes.ok) {
        const data = await initRes.json().catch(() => ({}))
        hypaError(data.message ||"Failed to initialize hot swap")
        return
      }

      const { uploadUrl } = await initRes.json()

      // 3. Upload directly to R2 (overwrites existing object in-place)
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      })

      if (!putRes.ok) {
        hypaError("Upload to storage failed")
        return
      }

      // 4. Complete hot swap — server verifies and updates DB
      const completeRes = await apiFetch("/api/v2/cdn/hot-swap", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: target.id, csrfToken }),
      })

      if (!completeRes.ok) {
        const data = await completeRes.json().catch(() => ({}))
        hypaError(data.message ||"Failed to complete hot swap")
        return
      }

      const result = await completeRes.json()

      // 5. Update local state with new size/contentType
      setAssets((prev) =>
        prev.map((a) =>
          a.id === target.id
            ? { ...a, size: result.fileSize, contentType: result.contentType }
            : a
        )
      )
      refreshUser()

      // Success notification — deferred so it fires after React's current render batch
      setTimeout(() => {
        hypaConfirm({
          title: "File hot swapped ✓",
          description: `If you still see the old image in preview, clear your browser cache. If the link is still showing the old file outside Hypastack, append ?v=1 to the end of the URL — e.g. ${target.cdnUrl}?v=1`,
          confirmText: "Close",
          confirmOnly: true,
        })
      }, 0)
    } catch (err) {
      console.error("Hot swap error:", err)
      hypaError("Hot swap failed")
    } finally {
      setSwapLoading(null)
      swapTargetRef.current = null
    }
  }

  // ── Copy / View (selection-based) ──
  const handleCopySelected = async () => {
    const urls = Array.from(selectedAssets)
      .map(id => assets.find(a => a.id === id)?.cdnUrl)
      .filter(Boolean)
      .join("\n")
    const ok = await copyToClipboard(urls)
    if (ok) {
      setCopiedSelection(true)
      setTimeout(() => setCopiedSelection(false), 2000)
    }
  }

  const handleViewSelected = () => {
    const ids = Array.from(selectedAssets)
    if (ids.length !== 1) return
    const asset = assets.find(a => a.id === ids[0])
    if (asset) window.open(asset.cdnUrl, "_blank", "noopener,noreferrer")
  }

  const handleBulkDelete = async () => {
    if (selectedAssets.size === 0) return

    const ids = Array.from(selectedAssets)
    const assetNames = ids.map(id => assets.find(a => a.id === id)?.name || "Unknown asset")
    await hypaConfirm({
      title: `Are you sure you want to delete ${ids.length} asset(s) forever?`,
      items: assetNames,
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        const res = await apiFetch("/api/v2/cdn/assets", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetIds: ids }),
        })
        if (!res.ok || !res.body) throw new Error("Failed to delete assets")
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        const deletedIds = new Set<string>()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""
          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const data = JSON.parse(line)
              if (data.success && data.id) deletedIds.add(data.id)
            } catch {}
          }
        }
        setAssets((prev) => prev.filter((a) => !deletedIds.has(a.id)))
        setSelectedAssets(new Set())
      },
    })
  }

  const toggleSelect = (id: string, forceMode?: 'select' | 'deselect') => {
    setSelectedAssets(prev => {
      const isSelected = prev.has(id)
      if (forceMode === 'select' && isSelected) return prev
      if (forceMode === 'deselect' && !isSelected) return prev

      const newSet = new Set(prev)
      if (forceMode === 'select' || (!forceMode && !isSelected)) {
        newSet.add(id)
      } else {
        newSet.delete(id)
      }
      return newSet
    })
    setWtStep(s => s === 3 ? 4 : s)
  }

  // Filter to current folder
  const currentFolders = folders.filter(f => f.parentId === currentFolderId)
  const filteredAssets = assets.filter(a => (a.folderId || null) === currentFolderId)

  const allInFolderSelected = filteredAssets.length > 0 && filteredAssets.every(a => selectedAssets.has(a.id))

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    setOpenMenuId(id)
    setContextMenuPos({ x: e.clientX, y: e.clientY })
  }

  const handleSelectAll = () => {
    if (filteredAssets.length === 0) return
    
    setSelectedAssets((prev) => {
      const next = new Set(prev)
      if (allInFolderSelected) {
        filteredAssets.forEach((a) => next.delete(a.id))
      } else {
        filteredAssets.forEach((a) => next.add(a.id))
      }
      return next
    })
  }

  const ITEMS_PER_PAGE = 16
  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / ITEMS_PER_PAGE))
  
  // Ensure current page is valid when filtering changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [filteredAssets.length, currentPage, totalPages])

  const paginatedAssets = filteredAssets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const breadcrumbs = getBreadcrumbs()

  if (!user) return null

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col">

      <div className="shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-2">
          <h1 className="text-[28px] font-medium tracking-tight text-[#171717] dark:text-[#e3e3e3] flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
            <span className="cursor-pointer hover:underline hover:text-[#171717] dark:hover:text-[#e3e3e3] text-[#333] dark:text-[#f7f8f8] dark:text-[#ccc] transition-colors" onClick={() => setCurrentFolderId(null)}>CDN Assets</span>
            {breadcrumbs.map(crumb => (
              <span key={crumb.id} className="flex items-center gap-2 text-[#666] dark:text-[#a1a1aa] dark:text-[#888] dark:text-[#898e97]">
                <MIcon name="chevron_right" size={20} className="text-[#999] dark:text-[#898e97] dark:text-[#a1a1aa]" />
                <span className="cursor-pointer hover:underline hover:text-[#111] dark:text-white dark:hover:text-[#f0f0f0] transition-colors" onClick={() => setCurrentFolderId(crumb.id)}>{crumb.name}</span>
              </span>
            ))}
          </h1>

          <motion.div layout className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {selectedAssets.size > 0 ? (
              <>
                <motion.div layout>
                  <SecondaryButton size="md" onClick={handleSelectAll} style={{ gap: 8 }}>
                    <MIcon name={allInFolderSelected ? "deselect" : "select_all"} size={15} className="shrink-0" />
                    <span className="hidden sm:inline">{allInFolderSelected ? "Deselect all" : "Select all"}</span>
                  </SecondaryButton>
                </motion.div>
                {/* Copy — all selected */}
                <motion.div layout>
                  <SecondaryButton
                    size="md"
                    onClick={handleCopySelected}
                    style={{ gap: 8, ...(copiedSelection ? { color: "#34d399" } : {}) }}
                  >
                    <MIcon name={copiedSelection ? "check" : "content_copy"} size={14} className="shrink-0" />
                    <span className="hidden sm:inline">{copiedSelection ? "Copied!" : `Copy${selectedAssets.size > 1 ? ` (${selectedAssets.size})` : ""}`}</span>
                  </SecondaryButton>
                </motion.div>
                <AnimatePresence mode="popLayout">
                  {/* View — single selection only */}
                  {selectedAssets.size === 1 && (
                    <motion.div key="view" layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ duration: 0.18 }}>
                      <SecondaryButton size="md" onClick={handleViewSelected} style={{ gap: 8 }}>
                        <MIcon name="open_in_new" size={14} className="shrink-0" />
                        <span className="hidden sm:inline">View</span>
                      </SecondaryButton>
                    </motion.div>
                  )}
                  {/* Hot Swap — single selection only */}
                  {selectedAssets.size === 1 && (
                    <motion.div key="swap" layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ duration: 0.18 }}>
                      <ShineButton
                        size="md"
                        onClick={handleHotSwapClick}
                        disabled={swapLoading !== null}
                        color="#d97706"
                        hoverColor="#b45309"
                        style={{ gap: 8 }}
                      >
                        {swapLoading !== null ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader size={16} color="#ffffff" />
                            <span className="hidden sm:inline">Swapping…</span>
                          </span>
                        ) : (
                          <>
                            <MIcon name="swap_horiz" size={15} className="shrink-0" />
                            <span className="hidden sm:inline">Swap</span>
                          </>
                        )}
                      </ShineButton>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Delete */}
                <motion.div layout>
                  <ShineButton
                    size="md"
                    onClick={handleBulkDelete}
                    disabled={deleteLoading === "bulk"}
                    color="#dc2626"
                    hoverColor="#b91c1c"
                    style={{ gap: 8 }}
                  >
                    {deleteLoading === "bulk" ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader size={16} color="#ffffff" />
                        Deleting…
                      </span>
                    ) : (
                      <>
                        <MIcon name="delete" size={16} className="shrink-0" />
                        Delete {selectedAssets.size}
                      </>
                    )}
                  </ShineButton>
                </motion.div>
              </>
            ) : (
              <>
                {filteredAssets.length > 0 && (
                  <motion.div layout>
                    <SecondaryButton size="md" onClick={handleSelectAll} style={{ gap: 8 }}>
                      <MIcon name="select_all" size={15} className="shrink-0" />
                      <span className="hidden sm:inline">Select all</span>
                    </SecondaryButton>
                  </motion.div>
                )}
                <motion.div layout>
                  <SecondaryButton size="md" onClick={handleCreateFolder} style={{ gap: 8 }}>
                    <MIcon name="create_new_folder" size={15} className="shrink-0" />
                    <span className="hidden sm:inline">New Folder</span>
                  </SecondaryButton>
                </motion.div>
                <motion.div layout>
                  <ShineButton size="md" onClick={() => fileInputRef.current?.click()} style={{ gap: 8 }}>
                    <MIcon name="cloud_upload" size={14} className="shrink-0" />
                    <span>Upload files</span>
                  </ShineButton>
                </motion.div>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
              accept="image/*,.pdf,.txt,.md,.zip,.mp3,.wav,.mp4,.webm"
            />
            {/* Hidden file input for hot swap */}
            <input
              ref={swapInputRef}
              type="file"
              onChange={handleHotSwapFileChange}
              className="hidden"
            />
          </motion.div>
        </div>

        {(assets.length > 0 || folders.length > 0) && !hideCtrlHint && (
          <div className="flex items-center gap-2 bg-[#f0f0f0] dark:bg-[#0e0f10] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] relative group pr-8" style={{ borderRadius: 9999, padding: '6px 16px' }}>
            <div className="flex items-center justify-center bg-white dark:bg-[rgba(255,255,255,0.06)] rounded-full px-2 py-0.5 text-[#555] dark:text-[#f7f8f8] text-[11px] font-bold border border-[rgba(0,0,0,0.08)] dark:border-transparent">CTRL</div>
            <span className="text-[#666] dark:text-[#898e97]" style={{ fontSize: 13, fontWeight: 400 }}>
              Hold CTRL and click or drag over files to quickly select many files
            </span>
            <SecondaryButton
              variant="ghost"
              iconOnly
              size="xs"
              onClick={() => {
                localStorage.setItem('hideCtrlHint', '1')
                setHideCtrlHint(true)
              }}
              className="absolute right-2 opacity-0 group-hover:opacity-100"
              aria-label="Dismiss hint"
            >
              <MIcon name="close" size={16} />
            </SecondaryButton>
          </div>
        )}
      </div>


      {uploadOpen && pendingUploadFiles && (
        <div className="mb-6">
          <UploadZone
            initialFiles={pendingUploadFiles}
            uploadType="cdn"
            autoStart={true}
            onUploadComplete={handleUploadComplete}
            onUploadStateChange={handleUploadStateChange}
            currentFolderId={currentFolderId}
          />
        </div>
      )}

      {currentFolders.length === 0 && filteredAssets.length === 0 && !currentFolderId ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState query="" username={user.nickname} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto mt-4 px-1.5 pt-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ paddingBottom: totalPages > 1 ? 64 : 16 }}>
            {currentFolders.length > 0 && (
              <div className="mb-4">
                <h2 className="text-[13px] font-medium text-[#666] dark:text-[#a1a1aa] dark:text-[#888] dark:text-[#898e97] mb-3 px-2">Folders</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {currentFolders.map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => setCurrentFolderId(folder.id)}
                      className="relative flex items-center p-[1px] rounded-full overflow-hidden group active:scale-[0.97] transition-transform duration-150 cursor-pointer"
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(0,0,0,0.05)] to-[rgba(0,0,0,0.12)] group-hover:to-[rgba(0,0,0,0.18)] dark:from-[rgba(255,255,255,0.05)] dark:to-[rgba(255,255,255,0.15)] dark:group-hover:to-[rgba(255,255,255,0.25)] transition-colors duration-300" />
                      <div className="relative bg-[#f4f4f4] dark:bg-[#151616] rounded-full h-[40px] px-4 flex items-center gap-2.5 w-full min-w-0">
                        <MIcon name="folder" size={16} className="text-[#666] dark:text-[#898e97] shrink-0" />
                        <span className="text-[#111] dark:text-[#f7f8f8] min-w-0 truncate flex-1 text-[14px] font-normal">{folder.name}</span>
                        <SecondaryButton
                          variant="ghost"
                          danger
                          iconOnly
                          onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id) }}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100"
                          style={{ height: 26, width: 26, borderRadius: 9999 }}
                          aria-label="Delete folder"
                        >
                          <MIcon name="delete" size={13} />
                        </SecondaryButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {currentFolderId && filteredAssets.length === 0 && currentFolders.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center min-h-[60vh] h-full">
                <MIcon name="folder_open" size={40} style={{ color: '#555', marginBottom: 12 }} />
                <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 16 }}>This folder is empty</p>
                <SecondaryButton
                  size="md"
                  onClick={() => setCurrentFolderId(breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].id : null)}
                  style={{ gap: 8 }}
                >
                  <MIcon name="arrow_back" size={14} />
                  Go back
                </SecondaryButton>
              </div>
            )}

            {paginatedAssets.length > 0 && (
              <div>
                {currentFolders.length > 0 && <h2 className="text-[13px] font-medium text-[#666] dark:text-[#a1a1aa] dark:text-[#888] dark:text-[#898e97] mb-3 px-2">Assets</h2>}
                <motion.div
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3"
                  initial="hidden"
                  animate="visible"
                  variants={gridVariants}
                >
                  {paginatedAssets.map((asset) => (
                    <CdnAssetTile
                      key={asset.id}
                      asset={asset}
                      selected={selectedAssets.has(asset.id)}
                      onToggleSelect={() => toggleSelect(asset.id)}
                      copiedId={copiedId}
                      onContextMenu={handleContextMenu}
                      isMenuOpen={openMenuId === asset.id}
                      contextMenuPos={contextMenuPos}
                      onCloseMenu={() => { setOpenMenuId(null); setContextMenuPos(null) }}
                      onCopy={handleCopy}
                      onView={(a) => window.open(a.cdnUrl, "_blank", "noopener,noreferrer")}
                      onHotSwap={handleHotSwapAsset}
                      onDelete={handleDelete}
                      onDragAction={(action) => {
                        if (action === 'start') {
                          const mode = selectedAssets.has(asset.id) ? 'deselect' : 'select'
                          dragModeRef.current = mode
                          toggleSelect(asset.id, mode)
                        } else if (action === 'enter') {
                          if (dragModeRef.current) {
                            toggleSelect(asset.id, dragModeRef.current)
                          }
                        }
                      }}
                    />
                  ))}
                </motion.div>
              </div>
            )}

        </div>
      )}

      {totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-between bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.02)] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.06)]" style={{ borderRadius: 12, padding: '8px 12px', marginTop: 8 }}>
          <p className="text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa]" style={{ fontSize: 13 }}>
            {(currentPage - 1) * ITEMS_PER_PAGE + 1}&ndash;{Math.min(currentPage * ITEMS_PER_PAGE, filteredAssets.length)} of {filteredAssets.length}
          </p>
          <div className="flex items-center gap-1.5">
            <SecondaryButton
              variant="ghost"
              iconOnly
              size="xs"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
              style={{ width: 28, height: 28, borderRadius: 6 }}
            >
              <MIcon name="chevron_left" size={16} />
            </SecondaryButton>
            <span className="text-[#171717] dark:text-[#e3e3e3]" style={{ fontSize: 13, fontWeight: 500, minWidth: 40, textAlign: 'center' }}>
              {currentPage}/{totalPages}
            </span>
            <SecondaryButton
              variant="ghost"
              iconOnly
              size="xs"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
              style={{ width: 28, height: 28, borderRadius: 6 }}
            >
              <MIcon name="chevron_right" size={16} />
            </SecondaryButton>
          </div>
        </div>
      )}

      <Walkthrough
        id="cdn_onboarding"
        currentStep={wtStep}
        steps={[
          { text: "Click the Upload button in the top-right to add your first CDN asset.", icon: "cloud_upload" },
          { text: "Your files are uploading, CDN assets get a permanent, public URL.", icon: "public" },
          { text: "Once uploaded, click 'Copy link' in the upload tray to get your CDN URL.", icon: "content_copy" },
          { text: "You're all set! Your CDN assets are live and ready to use.", icon: "celebration" },
        ]}
      />
    </div>
  )
}

function CdnAssetTile({
  asset,
  selected,
  onToggleSelect,
  onDragAction,
  onContextMenu,
  isMenuOpen,
  contextMenuPos,
  onCloseMenu,
  onCopy,
  onView,
  onHotSwap,
  onDelete,
  copiedId
}: {
  asset: CdnAsset
  selected: boolean
  onToggleSelect: () => void
  onDragAction: (action: 'start' | 'enter') => void
  onContextMenu: (e: React.MouseEvent, id: string) => void
  isMenuOpen: boolean
  contextMenuPos: { x: number; y: number } | null
  onCloseMenu: () => void
  onCopy: (url: string, id: string) => void
  onView: (asset: CdnAsset) => void
  onHotSwap: (asset: CdnAsset) => void
  onDelete: (id: string) => void
  copiedId: string | null
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const [imgLoading, setImgLoading] = useState(true)
  const [showSpinner, setShowSpinner] = useState(false)
  const [hover, setHover] = useState(false)
  const isImage = asset.contentType.startsWith("image/")
  const showImage = isImage && !imgFailed

  // Privacy gate. images start hidden until user confirms
  const [revealed, setRevealed] = useState(!isImage)

  // Only surface the spinner if the image is genuinely slow (>1s), so quick
  // loads don't flash a loader.
  useEffect(() => {
    if (!(revealed && showImage && imgLoading)) {
      setShowSpinner(false)
      return
    }
    const t = setTimeout(() => setShowSpinner(true), 1000)
    return () => clearTimeout(t)
  }, [revealed, showImage, imgLoading])
  
  const ext = asset.name.includes(".") ? asset.name.split(".").pop()?.toLowerCase() || "file" : "file"

  let typeLabel = "FILE"
  if (asset.contentType) {
    const sub = asset.contentType.split("/")[1]
    if (sub) typeLabel = sub.toUpperCase()
  }

  return (
    <motion.div variants={gridItemVariants} className="group relative">
      <div
        onClick={(e) => {
          if (!e.ctrlKey) {
            onToggleSelect()
          }
        }}
        onMouseDown={(e) => {
          if (e.ctrlKey) {
            e.preventDefault()
            onDragAction('start')
          }
        }}
        onContextMenu={(e) => onContextMenu(e, asset.id)}
        onMouseEnter={(e) => {
          setHover(true)
          if (e.buttons === 1 && e.ctrlKey) {
            onDragAction('enter')
          }
        }}
        onMouseLeave={() => setHover(false)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onToggleSelect()
          }
        }}
        className="relative w-full aspect-square overflow-hidden bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.02)] cursor-pointer transition-all select-none border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.06)]"
        style={{
          borderRadius: 12,
          outline: `3px solid ${selected ? "rgba(79,70,229,0.4)" : hover ? "rgba(79,70,229,0.15)" : "transparent"}`,
          outlineOffset: 2,
        }}
      >
        {!revealed && isImage && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.02)]">
            <div className="flex items-center justify-center mb-3">
              <MIcon name="image" size={20} style={{ color: '#999' }} />
            </div>
            <p className="text-[#888] dark:text-[#898e97]" style={{ fontSize: 12, marginBottom: 10 }}>
              Preview <span className="text-[#333] dark:text-[#f7f8f8]" style={{ fontWeight: 500 }}>.{ext}</span>
            </p>
            <SecondaryButton
              size="xs"
              onClick={(e) => {
                e.stopPropagation()
                setRevealed(true)
              }}
              style={{ borderRadius: 9999 }}
            >
              Reveal
            </SecondaryButton>
          </div>
        )}

        {revealed && showImage ? (
          <>
            {imgLoading && showSpinner && (
              <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-[#0e0f10]">
                <LoadingSvg size={28} />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.cdnUrl}
              alt={asset.name}
              className={`w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${imgLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setImgLoading(false)}
              onError={() => { setImgFailed(true); setImgLoading(false) }}
              loading="lazy"
            />
          </>
        ) : revealed && !showImage ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2 bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.02)]">
            <MIcon name="preview_off" size={24} style={{ color: '#bbb' }} />
            <span className="text-[12px] font-medium text-[#999] dark:text-[#898e97] dark:text-[#a1a1aa]">No preview available</span>
          </div>
        ) : null}

        <div
          className={`absolute top-3 left-3 transition-opacity z-20 ${
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkmark
            checked={selected}
            onChange={() => onToggleSelect()}
            size={20}
            aria-label={`Select ${asset.name}`}
          />
        </div>


      </div>

      <div className="mt-2 px-1.5 pb-1 min-w-0">
        <p
          className="truncate text-[#111] dark:text-white dark:text-[#e3e3e3]"
          style={{ fontSize: 12, fontWeight: 500 }}
          title={revealed ? asset.name : undefined}
        >
          {asset.name}
        </p>
        <p style={{ fontSize: 11, color: '#888', fontVariantNumeric: 'tabular-nums' }}>
          <span className="uppercase tracking-wider">{typeLabel}</span>
          <span className="mx-1">·</span>
          {formatBytes(asset.size)}
        </p>
      </div>

      <ContextMenu isOpen={isMenuOpen} pos={contextMenuPos} onClose={onCloseMenu}>
        <ContextMenuItem
          icon={copiedId === asset.id ? "check" : "content_copy"}
          label={copiedId === asset.id ? "Copied" : "Copy link"}
          onClick={() => { onCopy(asset.cdnUrl, asset.id); onCloseMenu() }}
          accent={copiedId === asset.id ? "success" : undefined}
        />
        <ContextMenuItem
          icon="open_in_new"
          label="View asset"
          onClick={() => { onView(asset); onCloseMenu() }}
        />
        <ContextMenuDivider />
        <ContextMenuItem
          icon="swap_horiz"
          label="Hot swap"
          onClick={() => { onHotSwap(asset); onCloseMenu() }}
          accent="warning"
        />
        <ContextMenuItem
          icon="delete"
          label="Delete"
          onClick={() => { onDelete(asset.id); onCloseMenu() }}
          accent="danger"
        />
      </ContextMenu>
    </motion.div>
  )
}

function EmptyState({ query, username }: { query: string; username: string }) {
  const FACTS = [
    `What's your move, ${username}?`,
    "Wanna share a file?",
    "Thanks for using Hypastack, I appreciate it.",
    "Did you know Hypastack was made by a solo European developer?",
    "Your files are end-to-end encrypted.",
    "Hypastack doesn't use third-party tracking scripts.",
    "No ads. No selling data. Just pure file sharing.",
    "Take a deep breath. Your privacy is safe here.",
    "Zero-knowledge architecture means we couldn't see your files even if we tried.",
    "Upload up to your limit, instantly.",
    "Hypastack runs entirely on edge networks.",
    "Share links automatically burn if you want them to.",
    "No email required to start sharing.",
    "Your data is wiped cleanly when you delete it. No lingering ghosts.",
    "A quiet place to store loud ideas.",
    "We sleep well at night knowing your data is yours alone.",
    "Designed for the privacy-conscious.",
    "Simple on the outside, engineered like a tank on the inside."
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (query) return;
    
    setIndex(Math.floor(Math.random() * FACTS.length));
    
    const interval = setInterval(() => {
      setIndex((prev) => {
        let next;
        do {
          next = Math.floor(Math.random() * FACTS.length);
        } while (next === prev);
        return next;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [query, FACTS.length]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="w-full max-w-md flex flex-col items-center">
        {query ? (
          <div className="inline-flex items-center justify-center mb-5 bg-[#f0f0f0] dark:bg-[#222] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)]" style={{ width: 64, height: 64, borderRadius: 6 }}>
            <MIcon name="search" size={28} className="text-[#999] dark:text-[#898e97] dark:text-[#a1a1aa]" />
          </div>
        ) : null}
        {query ? (
          <>
            <h3 className="text-[22px] font-semibold text-[#171717] dark:text-[#e3e3e3] mb-2 tracking-tight">
              No assets match your search
            </h3>
            <p className="text-[15px] text-[#666] dark:text-[#a1a1aa] dark:text-[#888] dark:text-[#898e97] font-normal leading-relaxed">
              Try a different search term.
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center w-full">
              <div className="relative h-[80px] w-full flex justify-center items-center">
                <AnimatePresence mode="wait">
                  <motion.h3
                    key={index}
                    initial={{ opacity: 0, y: 15, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -15, scale: 0.96 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute text-[26px] font-medium text-[#171717] dark:text-[#e3e3e3] tracking-tight leading-relaxed text-center w-full"
                  >
                    {FACTS[index]}
                  </motion.h3>
                </AnimatePresence>
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  )
}
