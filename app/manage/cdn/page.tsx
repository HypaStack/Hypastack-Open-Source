"use client"

import { hypaConfirm, hypaPrompt, hypaError, hypaProgress } from "@/components/ui/hypa-notif"
import { MIcon } from "@/components/ui/material-icon"
import { Loader } from "@/components/ui/loader"
import { ShineButton } from "@/components/ui/shine-button"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { Walkthrough } from "@/components/ui/walkthrough"
import { UploadZone } from "@/components/upload"
import { useManage, type CdnAssetItem } from "@/hooks/useManage"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { ContextMenu, ContextMenuItem } from "@/components/ui/context-menu"
import { apiFetch } from "@/lib/http/fetch"
import { errorMessage } from "@/lib/errors"
import { STORAGE_KEY_HIDE_CTRL_HINT } from "@/constants"
import { type CdnAsset, type CdnFolder, formatBytes, formatDate, gridVariants, gridItemVariants, getFileIcon } from "./_helpers"
import { CdnAssetTile } from "./_asset-tile"
import { EmptyState } from "./_empty-state"
import { GridSkeleton } from "./_grid-skeleton"
import { MoveDialog } from "../_move-dialog"
import { FolderTile } from "../_folder-tile"

export default function CdnPage() {
  const { user, cdnAssets: assets, setCdnAssets: setAssets, cdnFolders: folders, setCdnFolders: setFolders, refreshUser, isLoading } = useManage()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copiedSelection, setCopiedSelection] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set())
  const [moveOpen, setMoveOpen] = useState(false)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [hideCtrlHint, setHideCtrlHint] = useState(true)

  useEffect(() => {
    setHideCtrlHint(localStorage.getItem(STORAGE_KEY_HIDE_CTRL_HINT) === '1')
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

  const handleUploadComplete = (newAsset: CdnAssetItem | null) => {
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
      } else {
        const data = await res.json().catch(() => ({}))
        hypaError(data.message || "Failed to create folder")
      }
    } catch (err) {
      console.error("Failed to create CDN folder:", err)
      hypaError("Failed to create folder", errorMessage(err))
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId)
    const confirmed = await hypaConfirm({
      title: `Delete folder "${folder?.name || "Unknown"}" and all its contents?`,
      confirmText: "Delete",
      cancelText: "Cancel",
    })
    if (!confirmed) return

    // Wiping a folder can take out a lot of assets, and the endpoint streams one
    // line per asset — so show how far along it actually is.
    const progress = hypaProgress({ title: "Wiping folder", progressText: "Starting…" })
    try {
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
            else if (data.success && data.id) {
              deletedAssetIds.add(data.id)
              if (data.index && data.total) {
                progress.update(Math.round((data.index / data.total) * 100), `${data.index} of ${data.total}`)
              }
            }
          } catch { /* malformed line */ }
        }
      }
      const folderIdSet = new Set(deletedFolderIds.length > 0 ? deletedFolderIds : [folderId])
      setFolders(prev => prev.filter(f => !folderIdSet.has(f.id)))
      setAssets(prev => prev.filter(a => !deletedAssetIds.has(a.id) && (!a.folderId || !folderIdSet.has(a.folderId))))
      if (currentFolderId && folderIdSet.has(currentFolderId)) {
        setCurrentFolderId(folder?.parentId || null)
      }
    } catch (err) {
      hypaError("Failed to delete folder", errorMessage(err))
    } finally {
      progress.close()
    }
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
      hypaError("Hot swap failed", errorMessage(err))
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

  const handleBulkMove = async (folderId: string | null) => {
    const ids = Array.from(selectedAssets)
    if (ids.length === 0) return
    try {
      const res = await apiFetch("/api/v2/cdn/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetIds: ids, folderId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        hypaError(data.message || "Failed to move assets")
        return
      }
      const movedIds = new Set(ids)
      setAssets((prev) => prev.map((a) => (movedIds.has(a.id) ? { ...a, folderId } : a)))
      setSelectedAssets(new Set())
      setMoveOpen(false)
    } catch (err) {
      console.error("Move error:", err)
      hypaError("Failed to move assets")
    }
  }

  const handleBulkDelete = async () => {
    if (selectedAssets.size === 0) return

    const ids = Array.from(selectedAssets)
    const assetNames = ids.map(id => assets.find(a => a.id === id)?.name || "Unknown asset")
    const confirmed = await hypaConfirm({
      title: `Are you sure you want to delete ${ids.length} asset(s) forever?`,
      items: assetNames,
      confirmText: "Delete",
      cancelText: "Cancel",
    })
    if (!confirmed) return

    setDeleteLoading("bulk")
    // The endpoint streams one NDJSON line per deleted asset, so report the real count.
    const progress = hypaProgress({ title: "Deleting assets", progressText: `0 of ${ids.length}` })
    try {
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
            if (data.index && data.total) {
              progress.update(Math.round((data.index / data.total) * 100), `${data.index} of ${data.total}`)
            }
          } catch {}
        }
      }
      setAssets((prev) => prev.filter((a) => !deletedIds.has(a.id)))
      setSelectedAssets(new Set())
    } catch (err) {
      hypaError("Failed to delete assets", errorMessage(err))
    } finally {
      progress.close()
      setDeleteLoading(null)
    }
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

  // Keep rendering while the user is still loading so the skeleton can show
  // instead of a blank page that pops in.
  if (!user && !isLoading) return null

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
                {/* Move */}
                <motion.div layout>
                  <SecondaryButton size="md" onClick={() => setMoveOpen(true)} style={{ gap: 8 }}>
                    <MIcon name="drive_file_move" size={15} className="shrink-0" />
                    <span className="hidden sm:inline">Move</span>
                  </SecondaryButton>
                </motion.div>
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
                localStorage.setItem(STORAGE_KEY_HIDE_CTRL_HINT, '1')
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

      {isLoading ? (
        <div className="flex-1 min-h-0 overflow-hidden mt-4 px-1.5 pt-1.5 animate-in fade-in duration-200">
          <GridSkeleton />
        </div>
      ) : currentFolders.length === 0 && filteredAssets.length === 0 && !currentFolderId ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState query="" username={user?.nickname ?? ""} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto mt-4 px-1.5 pt-1.5 animate-in fade-in duration-300 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ paddingBottom: totalPages > 1 ? 64 : 16 }}>
            {currentFolders.length > 0 && (
              <div className="mb-4">
                <h2 className="text-[13px] font-medium text-[#666] dark:text-[#a1a1aa] dark:text-[#888] dark:text-[#898e97] mb-3 px-2">Folders</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {currentFolders.map((folder) => (
                    <FolderTile
                      key={folder.id}
                      name={folder.name}
                      onOpen={() => setCurrentFolderId(folder.id)}
                      onDelete={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id) }}
                    />
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

      {moveOpen && (
        <MoveDialog
          count={selectedAssets.size}
          folders={folders}
          currentFolderId={currentFolderId}
          rootLabel="CDN Assets"
          onCancel={() => setMoveOpen(false)}
          onMove={handleBulkMove}
        />
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
