"use client"

import { hypaConfirm, hypaProgress, hypaPrompt } from "@/components/ui/hypa-notif"
import { MIcon } from "@/components/ui/material-icon"
import { LoadingSvg } from "@/components/ui/loading-svg"
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
    const confirmed = await hypaConfirm({
      title: `Delete folder "${folder?.name || "Unknown"}" and all its contents?`,
      description: "This action cannot be undone.",
      confirmText: "Wipe",
      cancelText: "Cancel",
    })
    if (!confirmed) return

    const progress = hypaProgress({
      title: `Deleting "${folder?.name || "folder"}"...`,
      progressText: "Preparing...",
      progressPercent: 0,
    })

    try {
      const res = await apiFetch("/api/v2/cdn/folders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      })

      if (!res.ok || !res.body) {
        progress.close()
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Failed to delete folder")
        return
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
            if (data.done) {
              deletedFolderIds = data.deletedFolderIds || []
              progress.update({ progressText: "Cleaning up...", progressPercent: 100 })
            } else if (data.success && data.id) {
              deletedAssetIds.add(data.id)
              progress.update({
                progressText: `Deleting: ${data.name} (${data.index}/${data.total})`,
                progressPercent: (data.index / data.total) * 100,
              })
            }
          } catch { /* malformed line */ }
        }
      }

      progress.close()

      // Remove deleted folders and assets from local state
      const folderIdSet = new Set(deletedFolderIds.length > 0 ? deletedFolderIds : [folderId])
      setFolders(prev => prev.filter(f => !folderIdSet.has(f.id)))
      setAssets(prev => prev.filter(a => !deletedAssetIds.has(a.id) && (!a.folderId || !folderIdSet.has(a.folderId))))
      if (currentFolderId && folderIdSet.has(currentFolderId)) {
        setCurrentFolderId(folder?.parentId || null)
      }
    } catch (err) {
      progress.close()
      console.error("Failed to delete CDN folder:", err)
      alert("Failed to delete folder")
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
    const confirmed = await hypaConfirm({
      title: "Are you sure you want to delete this asset forever?",
      description: "This action cannot be undone.",
      items: asset ? [asset.name] : [],
      confirmText: "Wipe",
      cancelText: "Cancel",
    })
    if (!confirmed) return

    setDeleteLoading(assetId)
    try {
      const res = await apiFetch("/api/v2/cdn/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId }),
      })

      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== assetId))
        setWtStep(s => s === 4 ? 5 : s)
        setSelectedAssets((prev) => {
          const next = new Set(prev)
          next.delete(assetId)
          return next
        })
      } else {
        const data = await res.json()
        alert(data.error || "Failed to delete")
      }
    } catch (err) {
      console.error("Delete error:", err)
      alert("Failed to delete asset")
    } finally {
      setDeleteLoading(null)
    }
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
        alert(data.error || "Failed to initialize hot swap")
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
        alert("Upload to storage failed")
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
        alert(data.error || "Failed to complete hot swap")
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
      alert("Hot swap failed")
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

    const assetNames = Array.from(selectedAssets).map(id => assets.find(a => a.id === id)?.name || "Unknown asset")
    const confirmed = await hypaConfirm({
      title: `Are you sure you want to delete ${selectedAssets.size} asset(s) forever?`,
      description: "This action cannot be undone.",
      items: assetNames,
      confirmText: "Wipe",
      cancelText: "Cancel",
    })
    if (!confirmed) return

    setDeleteLoading('bulk')
    try {
      const progress = hypaProgress({
        title: "Deleting assets...",
        progressText: "Preparing to delete...",
        progressPercent: 0
      })

      const res = await apiFetch("/api/v2/cdn/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetIds: Array.from(selectedAssets) }),
      })

      if (res.ok && res.body) {
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
              if (data.success && data.id) {
                deletedIds.add(data.id)
              }
              if (data.index) {
                progress.update({ 
                  progressText: `Deleting: ${data.name} (${data.index}/${data.total})`,
                  progressPercent: (data.index / data.total) * 100 
                })
              }
            } catch(e) {}
          }
        }
        
        progress.close()
        setAssets((prev) => prev.filter((a) => !deletedIds.has(a.id)))
        setSelectedAssets(new Set())
      } else {
        alert("Failed to delete assets")
      }
    } catch (err) {
      console.error("Delete error:", err)
      alert("Failed to delete assets")
    } finally {
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

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {selectedAssets.size > 0 ? (
              <>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)] group-hover:to-[rgba(255,255,255,0.25)] transition-colors duration-300" />
                  <div className="relative bg-[#151616] rounded-full px-5 h-[40px] flex items-center justify-center gap-2 text-[#f7f8f8] text-[14px] font-medium">
                    <MIcon name={allInFolderSelected ? "deselect" : "select_all"} size={17} className="shrink-0" />
                    <span className="hidden sm:inline">{allInFolderSelected ? "Deselect all" : "Select all"}</span>
                  </div>
                </button>
                {/* Copy — all selected */}
                <button
                  type="button"
                  onClick={handleCopySelected}
                  className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150"
                >
                  <div className={`absolute inset-0 transition-colors duration-300 ${copiedSelection ? "bg-gradient-to-tr from-[rgba(16,185,129,0.2)] to-[rgba(16,185,129,0.4)] group-hover:to-[rgba(16,185,129,0.6)]" : "bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)] group-hover:to-[rgba(255,255,255,0.25)]"}`} />
                  <div className={`relative rounded-full px-5 h-[40px] flex items-center justify-center gap-2 text-[14px] font-medium ${copiedSelection ? "bg-[#0a1a14] text-emerald-400" : "bg-[#151616] text-[#f7f8f8]"}`}>
                    <MIcon name={copiedSelection ? "check" : "content_copy"} size={16} className="shrink-0" />
                    <span className="hidden sm:inline">{copiedSelection ? "Copied!" : `Copy${selectedAssets.size > 1 ? ` (${selectedAssets.size})` : ""}`}</span>
                  </div>
                </button>
                {/* View — single selection only */}
                {selectedAssets.size === 1 && (
                  <button
                    type="button"
                    onClick={handleViewSelected}
                    className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)] group-hover:to-[rgba(255,255,255,0.25)] transition-colors duration-300" />
                    <div className="relative bg-[#151616] rounded-full px-5 h-[40px] flex items-center justify-center gap-2 text-[#f7f8f8] text-[14px] font-medium">
                      <MIcon name="open_in_new" size={16} className="shrink-0" />
                      <span className="hidden sm:inline">View</span>
                    </div>
                  </button>
                )}
                {/* Hot Swap — single selection only */}
                {selectedAssets.size === 1 && (
                  <button
                    type="button"
                    onClick={handleHotSwapClick}
                    disabled={swapLoading !== null}
                    className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150 disabled:opacity-50"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(217,119,6,0.2)] to-[rgba(217,119,6,0.4)] group-hover:to-[rgba(217,119,6,0.6)] transition-colors duration-300" />
                    <div className="relative bg-[#fffbeb] dark:bg-[#1a1200] rounded-full px-5 h-[40px] flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 text-[14px] font-medium">
                      <MIcon name="swap_horiz" size={17} className="shrink-0" />
                      <span className="hidden sm:inline">{swapLoading !== null ? "Swapping…" : "Swap"}</span>
                    </div>
                  </button>
                )}
                {/* Delete */}
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={deleteLoading === "bulk"}
                  className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150 disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(239,68,68,0.3)] to-[rgba(239,68,68,0.6)] group-hover:to-[rgba(239,68,68,0.8)] transition-colors duration-300" />
                  <div className="relative bg-[#fef2f2] dark:bg-[#1a0808] rounded-full px-5 h-[40px] flex items-center justify-center gap-2 text-red-600 dark:text-red-400 text-[14px] font-medium">
                    <MIcon name="delete" size={18} />
                    {deleteLoading === "bulk" ? "Deleting…" : `Delete ${selectedAssets.size}`}
                  </div>
                </button>
              </>
            ) : (
              <>
                {filteredAssets.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)] group-hover:to-[rgba(255,255,255,0.25)] transition-colors duration-300" />
                    <div className="relative bg-[#151616] rounded-full px-5 h-[40px] flex items-center justify-center gap-2 text-[#f7f8f8] text-[14px] font-medium">
                      <MIcon name="select_all" size={17} className="shrink-0" />
                      <span className="hidden sm:inline">Select all</span>
                    </div>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCreateFolder}
                  className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)] group-hover:to-[rgba(255,255,255,0.25)] transition-colors duration-300" />
                  <div className="relative bg-[#151616] rounded-full px-5 h-[40px] flex items-center justify-center gap-2 text-[#f7f8f8] text-[14px] font-medium">
                    <MIcon name="create_new_folder" size={17} className="shrink-0" />
                    <span className="hidden sm:inline">New Folder</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#242526] via-[#242526] to-[#666c73] group-hover:to-[#888f98] transition-colors duration-300" />
                  <div className="relative bg-[#151616] rounded-full px-5 h-[40px] flex items-center justify-center gap-2 text-[#f7f8f8] text-[14px] font-medium">
                    <MIcon name="cloud_upload" size={15} className="shrink-0" />
                    <span>Upload files</span>
                  </div>
                </button>
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
          </div>
        </div>

        {(assets.length > 0 || folders.length > 0) && !hideCtrlHint && (
          <div className="flex items-center gap-2 bg-[#f0f0f0] dark:bg-[#0e0f10] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] relative group pr-8" style={{ borderRadius: 9999, padding: '6px 16px' }}>
            <div className="flex items-center justify-center bg-white dark:bg-[rgba(255,255,255,0.06)] rounded-full px-2 py-0.5 text-[#555] dark:text-[#f7f8f8] text-[11px] font-bold border border-[rgba(0,0,0,0.08)] dark:border-transparent">CTRL</div>
            <span className="text-[#666] dark:text-[#898e97]" style={{ fontSize: 13, fontWeight: 400 }}>
              Hold CTRL and click or drag over files to quickly select many files
            </span>
            <button 
              onClick={() => {
                localStorage.setItem('hideCtrlHint', '1')
                setHideCtrlHint(true)
              }}
              className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[#999] dark:text-[#898e97] hover:text-[#333] dark:text-[#f7f8f8] dark:hover:text-[#fff]"
              aria-label="Dismiss hint"
            >
              <MIcon name="close" size={16} />
            </button>
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
        <div className="flex-1 min-h-0 overflow-y-auto mt-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ paddingBottom: totalPages > 1 ? 64 : 16 }}>
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
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id) }}
                          className="opacity-0 group-hover:opacity-100 flex items-center justify-center shrink-0 transition-all focus:opacity-100 rounded-full hover:bg-[rgba(239,68,68,0.2)] text-[#666] dark:text-[#898e97] hover:text-red-500 dark:hover:text-red-400"
                          style={{ height: 26, width: 26 }}
                          aria-label="Delete folder"
                        >
                          <MIcon name="delete" size={13} />
                        </button>
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
                <button
                  onClick={() => setCurrentFolderId(breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].id : null)}
                  className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.98] transition-transform duration-150"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)] group-hover:to-[rgba(255,255,255,0.25)] transition-colors duration-300" />
                  <div className="relative bg-[#151616] rounded-full px-5 h-[40px] flex items-center justify-center gap-2 text-[#f7f8f8] text-[14px] font-medium">
                    <MIcon name="arrow_back" size={14} />
                    Go back
                  </div>
                </button>
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
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center justify-center text-[#666] dark:text-[#a1a1aa] dark:text-[#aaa] hover:bg-[#e5e5e5] dark:hover:bg-[#2c2c2c] active:scale-[0.97] transition-all duration-75 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ width: 28, height: 28, borderRadius: 6 }}
            >
               <MIcon name="chevron_left" size={16} />
            </button>
            <span className="text-[#171717] dark:text-[#e3e3e3]" style={{ fontSize: 13, fontWeight: 500, minWidth: 40, textAlign: 'center' }}>
              {currentPage}/{totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center justify-center text-[#666] dark:text-[#a1a1aa] dark:text-[#aaa] hover:bg-[#e5e5e5] dark:hover:bg-[#2c2c2c] active:scale-[0.97] transition-all duration-75 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ width: 28, height: 28, borderRadius: 6 }}
            >
               <MIcon name="chevron_right" size={16} />
            </button>
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
  const isImage = asset.contentType.startsWith("image/")
  const showImage = isImage && !imgFailed

  // Privacy gate. images start hidden until user confirms
  const [revealed, setRevealed] = useState(!isImage)
  
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
          if (e.buttons === 1 && e.ctrlKey) {
            onDragAction('enter')
          }
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onToggleSelect()
          }
        }}
        className={`relative w-full aspect-square overflow-hidden bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.02)] cursor-pointer transition-all select-none border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.06)] ${
          selected ? "" : "hover:opacity-90"
        }`}
        style={{ borderRadius: 12 }}
      >
        {!revealed && isImage && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.02)]">
            <div className="flex items-center justify-center mb-3">
              <MIcon name="image" size={20} style={{ color: '#999' }} />
            </div>
            <p className="text-[#888] dark:text-[#898e97]" style={{ fontSize: 12, marginBottom: 10 }}>
              Preview <span className="text-[#333] dark:text-[#f7f8f8]" style={{ fontWeight: 500 }}>.{ext}</span>
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setRevealed(true)
              }}
              className="relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden group active:scale-[0.97] transition-transform duration-150"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)] group-hover:to-[rgba(255,255,255,0.25)] transition-colors duration-300" />
              <div className="relative bg-[#151616] rounded-full px-3 h-[28px] flex items-center justify-center text-[#f7f8f8] text-[12px] font-medium">
                Reveal
              </div>
            </button>
          </div>
        )}

        {revealed && showImage ? (
          <>
            {imgLoading && (
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
          <span
            className={`inline-flex items-center justify-center h-5 w-5 transition-colors ${
              selected
                ? "bg-white text-black"
                : "bg-black/40 backdrop-blur-sm"
            }`}
            style={{ borderRadius: 6 }}
          >
            {selected && (
               <MIcon name="check" size={12} />
            )}
          </span>
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
