"use client"

import { UploadZone } from "@/components/upload-zone"

import { useEffect, useState, useRef, useMemo, useCallback, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { useAuth, type FileItem } from "@/hooks/useAuth"
import { MIcon } from "@/components/ui/material-icon"
import { Walkthrough } from "@/components/ui/walkthrough"
import { HintTip } from "@/components/ui/hint-tip"
import { hypaConfirm, hypaProgress, hypaPrompt } from "@/components/ui/hypa-notif"

const FILES_PER_PAGE = 10

function getFileExt(name: string): string {
  const dot = name.lastIndexOf(".")
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ""
}

function getFileTypeLabel(name: string, contentType?: string): string {
  const ext = getFileExt(name)
  if (ext) return ext.toUpperCase()
  if (contentType) {
    const sub = contentType.split("/")[1]
    if (sub) return sub.toUpperCase()
  }
  return "FILE"
}

function isImagePreviewable(contentType?: string, name?: string): boolean {
  if (contentType?.startsWith("image/")) return true
  if (name) {
    const ext = getFileExt(name)
    if (["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"].includes(ext)) return true
  }
  return false
}

function getFileIconForType(contentType?: string, name?: string): string {
  const ct = contentType || ""
  const ext = name ? getFileExt(name) : ""
  if (ct.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"].includes(ext)) return "image"
  if (ct.startsWith("audio/") || ["mp3", "wav", "flac", "ogg", "m4a"].includes(ext)) return "music_note"
  if (ct.startsWith("video/") || ["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "videocam"
  if (ct === "application/pdf" || ext === "pdf") return "article"
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext) || ct.includes("zip") || ct.includes("compressed")) return "archive"
  if (
    ["json", "js", "jsx", "ts", "tsx", "html", "css", "xml", "yaml", "yml", "toml", "sh"].includes(ext) ||
    ct.includes("javascript") ||
    ct.includes("json")
  )
    return "code"
  if (["exe", "msi", "dmg", "app", "apk"].includes(ext)) return "rocket_launch"
  if (["txt", "md", "rtf"].includes(ext) || ct.startsWith("text/")) return "article"
  if (["dll", "so", "dylib", "bin"].includes(ext)) return "package_2"
  return "description"
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "—"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

function formatDate(dateStr: string | Date): string {
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = d.toLocaleDateString("en-US", { month: "short" })
  const year = d.getFullYear()
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
  return `${day} ${month}, ${year} at ${time}`
}


type ViewMode = "list" | "grid"
type SortField = "name" | "size" | "date"
type SortDirection = "asc" | "desc"

function FilesPageInner() {
  const { user, files, folders, setFiles, setFolders, refreshUser, isLoading } = useAuth()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "")
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [starLoading, setStarLoading] = useState<string | null>(null)
  const lastStarTime = useRef<number>(0)
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [wtStep, setWtStep] = useState(0)
  const [pendingUploadFiles, setPendingUploadFiles] = useState<FileList | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // "Upload files" button -> open the OS picker directly. Once files come back
  // from the picker, we open the modal AND seed the UploadZone so it auto-uploads.
  const triggerFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files
    if (!rawFiles || rawFiles.length === 0) return
    // Clone the FileList before clearing input — clearing sets rawFiles.length to 0
    const dt = new DataTransfer()
    for (let i = 0; i < rawFiles.length; i++) dt.items.add(rawFiles[i])
    const cloned = dt.files
    setPendingUploadFiles(cloned)
    setUploadOpen(true)
    setWtStep(s => s === 0 ? 1 : s)
    // reset so picking the same file again triggers onChange
    e.target.value = ""
  }, [])

  const closeUpload = useCallback(() => {
    setUploadOpen(false)
    setPendingUploadFiles(null)
    setWtStep(s => s === 1 ? 2 : s)
    // Refresh data after upload to pick up new files
    refreshUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUploadStateChange = useCallback((uploadState: string) => {
    if (uploadState === "uploading" || uploadState === "encrypting" || uploadState === "zipping") {
      setWtStep(s => s === 1 ? 2 : s)
    } else if (uploadState === "copied") {
      setWtStep(s => s === 2 ? 3 : s)
    }
  }, [])

  const handleUploadComplete = useCallback(() => {
    refreshUser()
  }, [refreshUser])

  // Body scroll lock + Escape close while upload modal is open
  useEffect(() => {
    if (!uploadOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeUpload()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener("keydown", onKey)
    }
  }, [uploadOpen, closeUpload])

  // Sync search query when URL changes
  useEffect(() => {
    const q = searchParams.get("q") ?? ""
    setSearchQuery(q)
  }, [searchParams])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Close action menu on outside click
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
        setContextMenuPos(null)
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [])

  const filteredFolders = useMemo(() => {
    return folders
      .filter((f) => f.parentId === currentFolderId && f.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        const dir = sortDirection === "asc" ? 1 : -1
        if (sortField === "date") return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir
        return a.name.localeCompare(b.name) * dir
      })
  }, [folders, currentFolderId, searchQuery, sortField, sortDirection])

  const filteredFiles = useMemo(() => {
    return files
      .filter((f) => f.folderId === currentFolderId && f.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        const dir = sortDirection === "asc" ? 1 : -1
        if (sortField === "name") return a.name.localeCompare(b.name) * dir
        if (sortField === "size") return (a.size - b.size) * dir
        return (new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()) * dir
      })
  }, [files, currentFolderId, searchQuery, sortField, sortDirection])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection(field === "name" ? "asc" : "desc")
    }
    setWtStep(s => s === 4 ? 5 : s)
  }

  const totalPages = Math.ceil(filteredFiles.length / FILES_PER_PAGE)
  const paginatedFiles = filteredFiles.slice(
    (currentPage - 1) * FILES_PER_PAGE,
    currentPage * FILES_PER_PAGE
  )

  const handleCopyLink = (shareUrl: string, id: string) => {
    navigator.clipboard.writeText(shareUrl)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    // Step 2->3 is now handled by the UploadZone's internal copy button, but we keep this as a fallback
    setWtStep(s => s === 2 ? 3 : s)
  }

  const handleToggleStar = async (fileId: string, currentStarred: boolean) => {
    const now = Date.now()
    if (now - lastStarTime.current < 500) return
    lastStarTime.current = now

    setStarLoading(fileId)
    try {
      const res = await fetch("/api/v2/files", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, starred: !currentStarred }),
      })
      if (res.ok) {
        setFiles(files.map((f) => (f.id === fileId ? { ...f, starred: !currentStarred } : f)))
        setWtStep(s => s === 3 ? 4 : s)
      }
    } catch (err) {
      console.error("Star toggle error:", err)
    } finally {
      setStarLoading(null)
    }
  }

  const handleDelete = async (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    const confirmed = await hypaConfirm({
      title: "Are you sure you want to delete this file forever?",
      description: "This action cannot be undone.",
      items: file ? [file.name] : [],
      confirmText: "Wipe",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    setDeleteLoading(fileId)
    try {
      const res = await fetch("/api/v2/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      })
      if (res.ok) {
        setFiles(files.filter((f) => f.id !== fileId))
        setWtStep(s => s === 5 ? 6 : s)
        setSelectedFiles((prev) => {
          const next = new Set(prev)
          next.delete(fileId)
          return next
        })
      } else {
        const data = await res.json()
        alert(data.error || "Failed to delete file")
      }
    } catch (err) {
      console.error("Delete error:", err)
      alert("Failed to delete file")
    } finally {
      setDeleteLoading(null)
      setOpenMenuId(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return
    
    const fileNames = Array.from(selectedFiles).map(id => files.find(f => f.id === id)?.name || "Unknown file")
    const confirmed = await hypaConfirm({
      title: `Are you sure you want to delete ${selectedFiles.size} file(s) forever?`,
      description: "This action cannot be undone.",
      items: fileNames,
      confirmText: "Wipe",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    setDeleteLoading("bulk")
    try {
      const progress = hypaProgress({
        title: "Deleting files...",
        progressText: "Preparing to delete...",
        progressPercent: 0
      })

      const res = await fetch("/api/v2/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: Array.from(selectedFiles) }),
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
        setFiles(files.filter((f) => !deletedIds.has(f.id)))
        setSelectedFiles(new Set())
      } else {
        alert("Failed to delete files")
      }
    } catch (err) {
      console.error("Delete error:", err)
      alert("Failed to delete files")
    } finally {
      setDeleteLoading(null)
    }
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
      const res = await fetch("/api/v2/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId: currentFolderId })
      })
      if (res.ok) {
        const data = await res.json()
        setFolders([...folders, data.folder])
      } else {
        const data = await res.json()
        alert(data.error || "Failed to create folder")
      }
    } catch (err) {
      console.error("Failed to create folder", err)
    }
  }

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    const confirmed = await hypaConfirm({
      title: `Delete folder "${folderName}"?`,
      description: "This will permanently delete this folder and all files inside it. This cannot be undone.",
      items: [],
      confirmText: "Wipe",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    try {
      const res = await fetch("/api/v2/folders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId })
      })
      if (res.ok) {
        await refreshUser()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to delete folder")
      }
    } catch (err) {
      console.error("Delete folder error", err)
    }
  }

  const getBreadcrumbs = () => {
    const crumbs = []
    let curr = currentFolderId
    while (curr) {
      const f = folders.find(x => x.id === curr)
      if (f) {
        crumbs.unshift(f)
        curr = f.parentId
      } else {
        break
      }
    }
    return crumbs
  }

  const toggleSelect = (id: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedFiles.size === files.length && files.length > 0) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(files.map((f) => f.id)))
    }
  }

  if (!user) return null

  const isEmpty = filteredFiles.length === 0 && filteredFolders.length === 0
  const allSelected = files.length > 0 && selectedFiles.size === files.length

  return (
    <div className="flex-1 flex flex-col">
      {/* Page header with actions */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-medium tracking-tight text-white flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
          <span className="cursor-pointer hover:underline hover:text-white text-[#e3e3e3] transition-colors" onClick={() => setCurrentFolderId(null)}>Drive</span>
          {getBreadcrumbs().map(f => (
            <span key={f.id} className="flex items-center gap-2 text-[#a1a1aa]">
              <MIcon name="chevron_right" size={20} className="text-[#555]" />
              <span className="cursor-pointer hover:underline hover:text-white transition-colors" onClick={() => setCurrentFolderId(f.id)}>{f.name}</span>
            </span>
          ))}
        </h1>

        <div className="flex items-center gap-2">
          {selectedFiles.size > 0 ? (
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={deleteLoading === "bulk"}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[16px] bg-red-500 text-[#fefeff] font-medium text-[15px] hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <MIcon name="delete" size={18} />
              {deleteLoading === "bulk" ? "Deleting…" : `Delete ${selectedFiles.size}`}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCreateFolder}
                className="inline-flex items-center gap-2 px-4 py-[11px] rounded-[16px] bg-[#1f1f1f] text-white font-medium text-[15px] hover:bg-[#313131] transition-colors leading-none"
              >
                <MIcon name="create_new_folder" size={17} className="shrink-0" />
                <span className="hidden sm:inline">New Folder</span>
              </button>
              <button
                type="button"
                onClick={triggerFilePicker}
                className="inline-flex items-center gap-2 px-5 py-[11px] rounded-[16px] bg-white text-black font-medium text-[15px] hover:bg-[#e2e2e8] transition-colors leading-none"
              >
                <MIcon name="cloud_upload" size={15} className="shrink-0" />
                <span>Upload files</span>
              </button>
            </>
          )}

          {/* Hidden input — drives the OS file picker */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <MIcon name="refresh" size={24} className="text-[#a1a1aa] animate-spin" />
        </div>
      ) : isEmpty ? (
        <EmptyState query={searchQuery} username={user.nickname} />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Folders Section */}
          {filteredFolders.length > 0 && (
            <div>
              <h2 className="text-[13px] font-medium text-[#7a7a80] mb-3 px-2">Folders</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredFolders.map(folder => (
                  <div 
                    key={folder.id} 
                    onClick={() => setCurrentFolderId(folder.id)}
                    className="group flex items-center gap-3 bg-[#111111] hover:bg-[#222] active:scale-[0.97] transition-all duration-75 cursor-pointer border border-transparent hover:border-white/5"
                    style={{ height: 42, paddingLeft: 12, paddingRight: 6, borderRadius: 12 }}
                  >
                    <MIcon name="folder" size={16} style={{ color: 'rgba(255,255,255,0.6)', flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 400, color: '#e3e3e3', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{folder.name}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id, folder.name); }}
                      className="opacity-0 group-hover:opacity-100 flex items-center justify-center shrink-0 transition-all focus:opacity-100 hover:bg-red-500/15 text-[#555] hover:text-red-400"
                      style={{ height: 28, width: 28, borderRadius: 8 }}
                      aria-label="Delete folder"
                    >
                      <MIcon name="delete" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files Section */}
          {filteredFiles.length > 0 && (
            <div>
              {filteredFolders.length > 0 && <h2 className="text-[13px] font-medium text-[#7a7a80] mb-3 px-2">Files</h2>}
              {viewMode === "list" ? (
                <ListView
                  files={paginatedFiles}
                  selectedFiles={selectedFiles}
                  allSelected={allSelected}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onToggleSort={toggleSort}
                  onToggleSelect={toggleSelect}
                  onToggleSelectAll={toggleSelectAll}
                  onCopyLink={handleCopyLink}
                  copiedId={copiedId}
                  onDelete={handleDelete}
                  deleteLoading={deleteLoading}
                  onToggleStar={handleToggleStar}
                  starLoading={starLoading}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                  menuRef={menuRef}
                  contextMenuPos={contextMenuPos}
                  setContextMenuPos={setContextMenuPos}
                />
              ) : (
                <GridView
                  files={paginatedFiles}
                  selectedFiles={selectedFiles}
                  onToggleSelect={toggleSelect}
                  onCopyLink={handleCopyLink}
                  copiedId={copiedId}
                  onDelete={handleDelete}
                  deleteLoading={deleteLoading}
                  onToggleStar={handleToggleStar}
                  starLoading={starLoading}
                  onContextMenu={(e, id) => {
                    e.preventDefault();
                    setOpenMenuId(id);
                    const mainEl = e.currentTarget.closest('main');
                    if (mainEl) {
                      const rect = mainEl.getBoundingClientRect();
                      setContextMenuPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    } else {
                      setContextMenuPos({ x: e.clientX, y: e.clientY });
                    }
                  }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!isEmpty && totalPages > 1 && (
        <div className="flex items-center justify-between mt-7 px-2">
          <p className="text-[15px] text-[#a1a1aa] font-medium">
            Page {currentPage} of {totalPages} · {filteredFiles.length} {filteredFiles.length === 1 ? "file" : "files"}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-5 py-2 rounded-[16px] bg-[#1f1f1f] text-[15px] font-medium text-[#e2e2e8] hover:bg-[#1f1f1f] hover:text-[#e5e5eb] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-5 py-2 rounded-[16px] bg-[#1f1f1f] text-[15px] font-medium text-[#e2e2e8] hover:bg-[#1f1f1f] hover:text-[#e5e5eb] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* 
        When files were pre-selected via the OS picker, render the UploadZone
        outside any modal so only the bottom-right tray appears — no drop zone.
        The full modal is only used when opening the upload area without pre-selected files.
      */}
      {uploadOpen && pendingUploadFiles && (
        <UploadZone 
          initialFiles={pendingUploadFiles} 
          autoStart={false} 
          currentFolderId={currentFolderId}
          onUploadStateChange={handleUploadStateChange}
          onUploadComplete={handleUploadComplete}
        />
      )}

      {/* Full upload modal (only when no pre-selected files, e.g., drag-drop onto page) */}
      <AnimatePresence>
        {uploadOpen && !pendingUploadFiles && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[60] bg-black/60"
              onClick={closeUpload}
            />
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 6 }}
                className="relative w-full max-w-3xl max-h-[88vh] flex flex-col rounded-[32px] bg-[#111111] border border-white/5 overflow-hidden pointer-events-auto"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#222] shrink-0">
                  <h2 className="text-[18px] font-semibold text-white">Upload files</h2>
                  <button
                    type="button"
                    onClick={closeUpload}
                    className="p-1.5 rounded-[16px] text-[#a1a1aa] hover:text-white hover:bg-[#1f1f1f] transition-colors"
                    aria-label="Close"
                  >
                    <MIcon name="close" size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-transparent">
                  <UploadZone 
                    currentFolderId={currentFolderId}
                    onUploadStateChange={handleUploadStateChange} 
                    onUploadComplete={handleUploadComplete} 
                  />
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <Walkthrough
        id="drive_onboarding"
        currentStep={wtStep}
        steps={[
          { text: "Click the Upload button in the top-right to add your first file.", icon: "cloud_upload" },
          { text: "Now click Start in the bottom right to upload your files.", icon: "play_arrow" },
          { text: "Once uploaded, click 'Copy link' in the upload tray to get your secure share URL.", icon: "content_copy" },
          { text: "You're all set! Your files are encrypted and under your control.", icon: "celebration" },
        ]}
      />
    </div>
  )
}

export default function FilesPage() {
  return (
    <Suspense fallback={<div className="h-full w-full bg-[#111] animate-pulse" />}>
      <FilesPageInner />
    </Suspense>
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
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-[16px] bg-[#111111] border border-white/10 mb-5">
            <MIcon name="search" size={28} className="text-[#a1a1aa]" />
          </div>
        ) : null}
        {query ? (
          <>
            <h3 className="text-[22px] font-semibold text-white mb-2 tracking-tight">
              No files match your search
            </h3>
            <p className="text-[15px] text-[#7a7a80] font-normal leading-relaxed">
              Try a different search term.
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center w-full -translate-y-12">
              <div className="relative h-[80px] w-full flex justify-center items-center">
                <AnimatePresence mode="wait">
                  <motion.h3
                    key={index}
                    initial={{ opacity: 0, y: 15, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -15, scale: 0.96 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute text-[26px] font-medium text-[#f5f5f5] tracking-tight leading-relaxed text-center w-full"
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

function SortLabel({
  label,
  field,
  current,
  direction,
  onClick,
}: {
  label: string
  field: SortField
  current: SortField
  direction: SortDirection
  onClick: (f: SortField) => void
}) {
  const active = current === field
  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      className={`inline-flex items-center gap-1.5 text-[14px] font-medium tracking-wide transition-colors ${
        active ? "text-white" : "text-[#a1a1aa] hover:text-[#e5e5eb]"
      }`}
    >
      {label}
      <MIcon
        name="keyboard_arrow_down"
        size={14}
        className={`transition-all ${
          active
            ? `opacity-100 ${direction === "asc" ? "rotate-180" : ""}`
            : "opacity-0"
        }`}
      />
    </button>
  )
}

function ListView({
  files,
  selectedFiles,
  allSelected,
  sortField,
  sortDirection,
  onToggleSort,
  onToggleSelect,
  onToggleSelectAll,
  onCopyLink,
  copiedId,
  onDelete,
  deleteLoading,
  onToggleStar,
  starLoading,
  openMenuId,
  setOpenMenuId,
  menuRef,
  contextMenuPos,
  setContextMenuPos,
}: {
  files: FileItem[]
  selectedFiles: Set<string>
  allSelected: boolean
  sortField: SortField
  sortDirection: SortDirection
  onToggleSort: (f: SortField) => void
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  onCopyLink: (url: string, id: string) => void
  copiedId: string | null
  onDelete: (id: string) => void
  deleteLoading: string | null
  onToggleStar: (id: string, current: boolean) => void
  starLoading: string | null
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  menuRef: React.RefObject<HTMLDivElement | null>
  contextMenuPos: { x: number; y: number } | null
  setContextMenuPos: (pos: { x: number; y: number } | null) => void
}) {
  return (
    <div style={{ borderRadius: 20, backgroundColor: '#1f1f1f', padding: 3, boxShadow: '0 0 0 1px rgba(255,255,255,0.04)' }}>
      {/* Header row */}
      <div className="grid grid-cols-[44px_1fr_44px] md:grid-cols-[44px_1fr_240px_140px_44px] items-center gap-2 md:gap-4 px-3 py-2">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onToggleSelectAll}
          aria-label="Select all"
        />
        <SortLabel label="Name" field="name" current={sortField} direction={sortDirection} onClick={onToggleSort} />
        <div className="hidden md:block">
          <SortLabel label="Modified" field="date" current={sortField} direction={sortDirection} onClick={onToggleSort} />
        </div>
        <div className="hidden md:block">
          <SortLabel label="Size" field="size" current={sortField} direction={sortDirection} onClick={onToggleSort} />
        </div>
        <span />
      </div>

      {/* Rows */}
      <div style={{ backgroundColor: '#111111', borderRadius: 17, overflow: 'hidden' }}>
        {files.map((file) => {
          const isSelected = selectedFiles.has(file.id)
          const Icon = getFileIconForType(file.contentType, file.name)
          const isImage = isImagePreviewable(file.contentType, file.name)
          const isMenuOpen = openMenuId === file.id
          return (
            <div
              key={file.id}
              data-selected={isSelected}
              className="drive-row group grid grid-cols-[44px_1fr_44px] md:grid-cols-[44px_1fr_240px_140px_44px] items-center gap-2 md:gap-4 px-3 py-3 cursor-pointer select-none"
              onClick={(e) => {
                // If they clicked the checkbox or buttons, ignore
                if ((e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('button')) return;
                onToggleSelect(file.id);
              }}
              onDoubleClick={(e) => {
                if ((e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('button')) return;
                window.open(`/d/${file.id}`, '_blank');
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setOpenMenuId(file.id);
                const mainEl = e.currentTarget.closest('main');
                if (mainEl) {
                  const rect = mainEl.getBoundingClientRect();
                  setContextMenuPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                } else {
                  setContextMenuPos({ x: e.clientX, y: e.clientY });
                }
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(file.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select ${file.name}`}
              />

              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative h-8 w-8 rounded-md overflow-hidden shrink-0 flex items-center justify-center text-white">
                  <MIcon name={getFileIconForType(file.contentType, file.name)} size={22} />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[14px] font-normal text-[#e3e3e3] truncate" title={file.name}>
                      {file.name}
                    </span>

                    {!!file.burnOnRead && (
                      <span title="Burn on read" className="text-orange-400 shrink-0">
                        <MIcon name="local_fire_department" size={13} />
                      </span>
                    )}
                    {!!file.starred && (
                      <span title="Starred" className="text-yellow-500 shrink-0">
                        <MIcon name="star" size={13} />
                      </span>
                    )}
                  </div>
                  <div className="flex md:hidden items-center gap-2 mt-0.5 text-[12px] text-[#555]">
                    <span>{formatBytes(file.size)}</span>
                    <span className="w-1 h-1 rounded-full bg-[#333]" />
                    <span>{formatDate(file.uploadedAt).split(' at ')[0]}</span>
                  </div>
                </div>
              </div>

              <span className="hidden md:block text-[13px] text-[#555] font-normal" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatDate(file.uploadedAt)}
              </span>

              <span className="hidden md:block text-[13px] text-[#555] font-normal" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatBytes(file.size)}
              </span>

              <div className="relative flex justify-end">

                <AnimatePresence>
                  {isMenuOpen && (
                    <motion.div
                      ref={menuRef}
                      initial={{ opacity: 0, scale: 0.98, ...(contextMenuPos ? {} : { y: 4 }) }}
                      animate={{ opacity: 1, scale: 1, ...(contextMenuPos ? {} : { y: 0 }) }}
                      exit={{ opacity: 0, scale: 0.98, ...(contextMenuPos ? {} : { y: 4 }) }}
                      transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
                      className={contextMenuPos ? "fixed z-[9999]" : "absolute right-0 top-full mt-1.5 z-30"}
                      style={{ 
                        width: 220, 
                        padding: 6,
                        borderRadius: 20, 
                        backgroundColor: '#171717', 
                        boxShadow: '0 0 0 1px rgba(255,255,255,0.04)', 
                        transformOrigin: contextMenuPos ? 'top left' : 'top right',
                        ...(contextMenuPos ? { left: contextMenuPos.x, top: contextMenuPos.y } : {})
                      }}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (!target.closest('button') && !target.closest('a')) {
                          setOpenMenuId(null);
                          setContextMenuPos(null);
                        }
                      }}
                    >
                      <ActionItem
                        icon={copiedId === file.id ? "check" : "content_copy"}
                        label={copiedId === file.id ? "Copied" : "Copy link"}
                        onClick={() => { onCopyLink(file.shareUrl, file.id); setOpenMenuId(null); setContextMenuPos(null) }}
                        accent={copiedId === file.id ? "success" : undefined}
                      />
                      <ActionLink icon="visibility" label="View" href={`/d/${file.id}`} onClick={() => { setOpenMenuId(null); setContextMenuPos(null) }} />
                      <ActionItem
                        icon="star"
                        label={file.starred ? "Unstar" : "Star"}
                        onClick={() => { onToggleStar(file.id, file.starred); setOpenMenuId(null); setContextMenuPos(null) }}
                        disabled={starLoading === file.id}
                      />
                      <ActionItem
                        icon="delete"
                        label={deleteLoading === file.id ? "Deleting…" : "Delete"}
                        onClick={() => { onDelete(file.id); setContextMenuPos(null) }}
                        disabled={deleteLoading === file.id}
                        accent="danger"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ActionItem({
  icon,
  label,
  onClick,
  disabled,
  accent,
}: {
  icon: string
  label: string
  onClick: () => void
  disabled?: boolean
  accent?: "danger" | "success"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center bg-transparent hover:bg-[#282828] active:scale-[0.97] transition-all duration-75 cursor-pointer disabled:opacity-50"
      style={{ height: 38, paddingLeft: 14, paddingRight: 14, borderRadius: 14, border: 'none' }}
    >
      <div className="flex items-center w-full" style={{ gap: 12 }}>
        <span className="shrink-0" style={{ color: accent === 'danger' ? '#f87171' : accent === 'success' ? '#4ade80' : 'rgba(255,255,255,0.6)' }}>
          <MIcon name={icon} size={15} />
        </span>
        <span style={{ fontSize: 14, fontWeight: 400, color: accent === 'danger' ? '#f87171' : '#e3e3e3', lineHeight: 1 }}>{label}</span>
      </div>
    </button>
  )
}

function ActionLink({
  icon,
  label,
  href,
  onClick,
}: {
  icon: string
  label: string
  href: string
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center hover:bg-[#282828] active:scale-[0.97] transition-all duration-75 cursor-pointer"
      style={{ height: 38, paddingLeft: 14, paddingRight: 14, borderRadius: 14, border: 'none' }}
    >
      <div className="flex items-center w-full" style={{ gap: 12 }}>
        <span className="shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <MIcon name={icon} size={15} />
        </span>
        <span style={{ fontSize: 14, fontWeight: 400, color: '#e3e3e3', lineHeight: 1 }}>{label}</span>
      </div>
    </Link>
  )
}

function FileThumb({
  id,
  name,
  fallbackIcon,
}: {
  id: string
  name: string
  fallbackIcon: string
}) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className="h-full w-full flex items-center justify-center text-[#7dd3fc]">
        <MIcon name={fallbackIcon} size={20} />
      </div>
    )
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={`/api/v2/files/${id}/preview`}
      alt={name}
      className="h-full w-full object-cover select-none pointer-events-none"
      draggable={false}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  )
}

function GridView({
  files,
  selectedFiles,
  onToggleSelect,
  onCopyLink,
  copiedId,
  onDelete,
  deleteLoading,
  onToggleStar,
  starLoading,
  onContextMenu,
}: {
  files: FileItem[]
  selectedFiles: Set<string>
  onToggleSelect: (id: string) => void
  onCopyLink: (url: string, id: string) => void
  copiedId: string | null
  onDelete: (id: string) => void
  deleteLoading: string | null
  onToggleStar: (id: string, current: boolean) => void
  starLoading: string | null
  onContextMenu: (e: React.MouseEvent, id: string) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {files.map((file) => {
        const isSelected = selectedFiles.has(file.id)
        const iconName = getFileIconForType(file.contentType, file.name)
        const isImage = isImagePreviewable(file.contentType, file.name)
        return (
          <div key={file.id} className="group relative bg-[#1f1f1f] rounded-[24px] p-[3px]" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.04)' }}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => onToggleSelect(file.id)}
            onDoubleClick={() => window.open(`/d/${file.id}`, '_blank')}
            onContextMenu={(e) => onContextMenu(e, file.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleSelect(file.id) } }}
            className={`relative w-full aspect-square rounded-[21px] overflow-hidden bg-[#111111] cursor-pointer transition-all select-none ${
              isSelected ? "opacity-80" : "hover:opacity-90"
            }`}
          >
            {/* Always show icon — previews disabled (files are encrypted) */}
            <div className="absolute inset-0 flex items-center justify-center">
              <MIcon name={iconName} size={48} className="text-[#7dd3fc]" />
            </div>

              {/* Top-right flags */}
              <div className="absolute top-2 right-2 flex items-center gap-1 z-10">

                {!!file.burnOnRead && (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-[16px] bg-black/40 backdrop-blur-sm text-orange-400">
                    <MIcon name="local_fire_department" size={12} />
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleStar(file.id, file.starred)
                  }}
                  disabled={starLoading === file.id}
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-[16px] backdrop-blur-sm transition-all ${
                    file.starred
                      ? "bg-black/40 text-yellow-500"
                      : "bg-black/40 text-zinc-300 opacity-0 group-hover:opacity-100"
                  }`}
                  aria-label={file.starred ? "Unstar" : "Star"}
                >
                  <MIcon name="star" size={14} className={file.starred ? "" : ""} />
                </button>
              </div>

              {/* Hover action bar */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-x-0 bottom-0 px-2 pb-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <div className="flex items-center gap-1 rounded-[16px] bg-black/40 backdrop-blur-md p-1">
                  <button
                    type="button"
                    onClick={() => onCopyLink(file.shareUrl, file.id)}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-[10px] text-xs font-medium transition-colors ${
                      copiedId === file.id ? "text-emerald-400" : "text-white/90 hover:bg-white/10"
                    }`}
                  >
                     {copiedId === file.id ? <MIcon name="check" size={12} /> : <MIcon name="content_copy" size={12} />}
                    {copiedId === file.id ? "Copied" : "Copy"}
                  </button>
                  <Link
                    href={`/d/${file.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-[10px] text-xs font-medium text-white/90 hover:bg-white/10 transition-colors"
                  >
                     <MIcon name="visibility" size={12} />
                    View
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(file.id)}
                    disabled={deleteLoading === file.id}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-[10px] text-xs font-medium text-red-400 hover:bg-red-500/15 transition-colors disabled:opacity-50"
                  >
                     <MIcon name="delete" size={12} />
                    {deleteLoading === file.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>
          </div>

            {/* Filename + meta below tile */}
            <div className="mt-3 px-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#e3e3e3] truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-[11px] text-[#a1a1aa] mt-1 font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                <span className="uppercase tracking-wider">
                  {getFileTypeLabel(file.name, file.contentType)}
                </span>
                <span className="mx-1.5 text-[#555]">·</span>
                {formatBytes(file.size)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
