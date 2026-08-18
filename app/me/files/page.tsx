"use client"

import { UploadZone } from "@/components/upload"
import { Loader } from "@/components/ui/loader"

import { useEffect, useState, useRef, useMemo, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { ContextMenu, ContextMenuItem, ContextMenuAction, ContextMenuSub, ContextMenuTreeItem, ContextMenuDivider, ContextMenuLink } from "@/components/ui/context-menu"
import { useManage } from "@/hooks/useManage"
import { MIcon } from "@/components/ui/material-icon"
import { Button, Tabs, toast } from "@heroui/react"
import { SharedElementTransition, useDrop } from "react-aria-components"
import { Walkthrough } from "@/components/ui/walkthrough"
import { hypaConfirm, hypaPrompt, hypaError, hypaProgress } from "@/components/ui/hypa-notif"
import { errorMessage } from "@/lib/errors"
import { FILES_PER_PAGE } from "@/constants"
import { apiFetch } from "@/lib/http/fetch"
import { type SortField, type SortDirection } from "./_helpers"
import { EmptyState } from "./_empty-state"
import { ListView } from "./_list-view"
import { toTree } from "../_move-dialog"


function FilesPageInner() {
  const { user, files, folders, setFiles, setFolders, refreshUser } = useManage()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "")
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const activeContextMenuFile = files.find(f => f.id === openMenuId)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [wtStep, setWtStep] = useState(0)
  const [pendingUploadFiles, setPendingUploadFiles] = useState<FileList | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const rootDropRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // "Upload files" button -> open the OS picker directly. Once files come back
  // from the picker, we open the modal AND seed the UploadZone so it auto-uploads.
  const triggerFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files
    if (!rawFiles || rawFiles.length === 0) return
    // Clone the FileList before clearing input, clearing sets rawFiles.length to 0
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

  const folderTree = useMemo(() => toTree(folders), [folders])

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

  const handleDelete = async (fileId: string) => {
    await hypaConfirm({
      title: "Are you sure you want to delete this file forever?",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        const res = await apiFetch("/api/v2/files", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message || "Failed to delete file")
        }
        setFiles((prev) => prev.filter((f) => f.id !== fileId))
        setWtStep(s => s === 5 ? 6 : s)
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.delete(fileId)
          return next
        })
        toast.success("File deleted")
      },
    })
    setOpenMenuId(null)
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    const fileIds = Array.from(selectedIds).filter((id) => files.some((f) => f.id === id))
    const folderIds = Array.from(selectedIds).filter((id) => folders.some((f) => f.id === id))
    const itemCount = fileIds.length + folderIds.length
    const confirmed = await hypaConfirm({
      title: `Are you sure you want to delete ${itemCount} item(s) forever?`,
      description: folderIds.length > 0 ? "Deleting a folder also deletes everything inside it. This cannot be undone." : undefined,
      confirmText: "Delete",
      cancelText: "Cancel",
    })
    if (!confirmed) return

    setDeleteLoading("bulk")
    try {
      if (fileIds.length > 0) {
        // The endpoint streams one NDJSON line per deleted file, so report the real count.
        const progress = hypaProgress({ title: "Deleting files", progressText: `0 of ${fileIds.length}` })
        try {
          const res = await apiFetch("/api/v2/files", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileIds }),
          })
          if (!res.ok || !res.body) throw new Error("Failed to delete files")
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
          setFiles((prev) => prev.filter((f) => !deletedIds.has(f.id)))
        } finally {
          progress.close()
        }
      }

      if (folderIds.length > 0) {
        for (const folderId of folderIds) {
          const res = await apiFetch("/api/v2/folders", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folderId }),
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            hypaError(data.message || "Failed to delete folder")
          }
        }
        await refreshUser()
      }

      setSelectedIds(new Set())
      toast.success(`Deleted ${itemCount} item${itemCount === 1 ? "" : "s"}`)
    } catch (err) {
      hypaError("Failed to delete", errorMessage(err))
    } finally {
      setDeleteLoading(null)
    }
  }

  useDrop({
    ref: rootDropRef,
    getDropOperation: (types) => (types.has("text/plain") ? "move" : "cancel"),
    onDrop: async (e) => {
      const ids = await Promise.all(
        e.items.map((item) => (item.kind === "text" ? item.getText("text/plain") : Promise.resolve("")))
      )
      const moved = ids.filter(Boolean)
      if (moved.length > 0) moveFiles(moved, null)
    },
  })

  const moveFiles = async (ids: string[], folderId: string | null) => {
    if (ids.length === 0) return

    // Dropping a file back where it already lives isn't worth a request.
    const toMove = ids.filter((id) => files.find((f) => f.id === id)?.folderId !== folderId)
    if (toMove.length === 0) {
      toast.warning(
        ids.length === 1
          ? "That file is already in this folder"
          : "Those files are already in this folder"
      )
      return
    }

    try {
      const res = await apiFetch("/api/v2/files", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: toMove, folderId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        hypaError(data.message || "Failed to move files")
        return
      }
      const movedIds = new Set(toMove)
      setFiles((prev) => prev.map((f) => (movedIds.has(f.id) ? { ...f, folderId } : f)))
      setSelectedIds(new Set())
      toast.success(`Moved ${toMove.length} file${toMove.length === 1 ? "" : "s"}`)
    } catch (err) {
      console.error("Move error:", err)
      hypaError("Failed to move files")
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
      const res = await apiFetch("/api/v2/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId: currentFolderId })
      })
      if (res.ok) {
        const data = await res.json()
        setFolders([...folders, data.folder])
        toast.success("Folder created")
      } else {
        const data = await res.json()
        hypaError(data.message ||"Failed to create folder")
      }
    } catch (err) {
      console.error("Failed to create folder", err)
      hypaError("Failed to create folder", errorMessage(err))
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    const confirmed = await hypaConfirm({
      title: "Delete this folder?",
      description: "This will permanently delete this folder and all files inside it. This cannot be undone.",
      confirmText: "Wipe",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    try {
      const res = await apiFetch("/api/v2/folders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId })
      })
      if (res.ok) {
        await refreshUser()
        toast.success("Folder deleted")
      } else {
        const data = await res.json()
        hypaError(data.message ||"Failed to delete folder")
      }
    } catch (err) {
      console.error("Delete folder error", err)
      hypaError("Failed to delete folder", errorMessage(err))
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

  if (!user) return null

  return (
    <Tabs defaultSelectedKey="drive" className="flex-1 flex flex-col">
      {/* h-10 matches the Tabs list (tab h-8 + list p-1), so the headline is
          centred on the same line as the tabs and the sidebar's top row. */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-3 sm:h-10 mb-2">
        <h1 className="shrink-0 text-[28px] font-medium tracking-tight text-[#171717] dark:text-[#e3e3e3] flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap max-w-full">
          <span className={`cursor-pointer hover:underline hover:text-[#171717] dark:hover:text-[#e3e3e3] transition-colors ${currentFolderId ? "text-[#999] dark:text-[#898e97]" : "text-[#333] dark:text-[#f7f8f8] dark:text-[#ccc]"}`} onClick={() => setCurrentFolderId(null)}>Drive</span>
          {getBreadcrumbs().map((f, i, arr) => (
            <span key={f.id} className="flex items-center gap-2 text-[#666] dark:text-[#a1a1aa] dark:text-[#888] dark:text-[#898e97]">
              <MIcon name="chevron_right" size={20} className="text-[#999] dark:text-[#898e97] dark:text-[#a1a1aa]" />
              <span className={`cursor-pointer hover:underline transition-colors ${i === arr.length - 1 ? "text-[#171717] dark:text-[#e3e3e3]" : "text-[#999] dark:text-[#898e97] hover:text-[#111] dark:hover:text-[#f0f0f0]"}`} onClick={() => setCurrentFolderId(f.id)}>{f.name}</span>
            </span>
          ))}
        </h1>

        <SharedElementTransition>
          <Tabs.ListContainer>
            <Tabs.List aria-label="View">
              <Tabs.Tab id="drive">
                Drive
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="deleted" isDisabled className="whitespace-nowrap">
                Recently deleted
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </SharedElementTransition>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
          {selectedIds.size > 0 ? (
            <>
              <Button
                variant="danger"
                size="md"
                onPress={handleBulkDelete}
                isDisabled={deleteLoading === "bulk"}
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
                    Delete {selectedIds.size}
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="tertiary"
                size="md"
                onPress={handleCreateFolder}
                style={{ gap: 8 }}
              >
                <MIcon name="create_new_folder" size={17} className="shrink-0" />
                <span className="hidden sm:inline">New Folder</span>
              </Button>
              <Button
                variant="primary"
                size="md"
                onPress={triggerFilePicker}
                style={{ gap: 8 }}
              >
                <MIcon name="cloud_upload" size={15} className="shrink-0" />
                <span>Upload files</span>
              </Button>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>
      </div>

      {/* Dropping a dragged file anywhere in the panel but not on a folder row
          sends it back to the Drive root. Drops handled by the table itself
          (onto a folder, or its own root area) never reach here. */}
      <Tabs.Panel id="drive" className="flex-1 flex flex-col p-0">
        {/* Plain div rather than the Panel itself: Tabs.Panel is a function
            component that only spreads props, so the drop ref isn't guaranteed
            to reach a DOM node. flex-1 makes the zone cover the empty area
            below the table. */}
        <div ref={rootDropRef} className="flex-1 flex flex-col">
        {filteredFiles.length === 0 && filteredFolders.length === 0 ? (
          <EmptyState query={searchQuery} username={user.nickname} />
        ) : (
          <div className="animate-in fade-in duration-300">
            <ListView
              folders={filteredFolders}
              files={paginatedFiles}
              allFolders={folders}
              allFiles={files}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onOpenFolder={setCurrentFolderId}
              onDeleteFolder={handleDeleteFolder}
              onMoveFiles={(ids, folderId) => moveFiles(ids, folderId)}
              onContextMenu={(e, id) => {
                e.preventDefault();
                setOpenMenuId(id);
                setContextMenuPos({ x: e.clientX, y: e.clientY });
              }}
            />
          </div>
        )}

        {filteredFiles.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between mt-7 px-2">
            <p className="text-[15px] text-[#666] dark:text-[#a1a1aa] dark:text-[#888] dark:text-[#898e97] font-medium">
              Page {currentPage} of {totalPages} · {filteredFiles.length} {filteredFiles.length === 1 ? "file" : "files"}
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="tertiary"
                size="md"
                onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                isDisabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="tertiary"
                size="md"
                onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                isDisabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
        </div>
      </Tabs.Panel>

      {/* 
        When files were pre-selected via the OS picker, render the UploadZone
        outside any modal so only the bottom-right tray appears, no drop zone.
        The full modal is only used when opening the upload area without pre-selected files.
      */}
      {uploadOpen && pendingUploadFiles && (
        <UploadZone
          initialFiles={pendingUploadFiles}
          autoStart={false}
          currentFolderId={currentFolderId}
          onUploadStateChange={handleUploadStateChange}
          onUploadComplete={handleUploadComplete}
          onClose={closeUpload}
        />
      )}

      <AnimatePresence>
        {uploadOpen && !pendingUploadFiles && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[60] bg-black/30"
              onClick={closeUpload}
            />
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 6 }}
                className="relative w-full max-w-3xl max-h-[88vh] flex flex-col rounded-[16px] bg-white dark:bg-[#121212] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] overflow-hidden pointer-events-auto"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] shrink-0">
                  <h2 className="text-[18px] font-semibold text-[#171717] dark:text-[#e3e3e3]">Upload files</h2>
                  <Button
                    variant="ghost"
                    isIconOnly
                    size="sm"
                    onPress={closeUpload}
                    aria-label="Close"
                  >
                    <MIcon name="close" size={20} />
                  </Button>
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

      <ContextMenu isOpen={!!activeContextMenuFile} pos={contextMenuPos} onClose={() => { setOpenMenuId(null); setContextMenuPos(null) }}>
        {activeContextMenuFile && (
          <>
            <ContextMenuItem
              icon="content_copy"
              label="Copy link"
              onClick={() => { handleCopyLink(activeContextMenuFile.shareUrl, activeContextMenuFile.id); setOpenMenuId(null); setContextMenuPos(null) }}
            />
            <ContextMenuLink
              icon="open_in_new"
              label="View"
              href={`/d/${activeContextMenuFile.id}`}
              onClick={() => { setOpenMenuId(null); setContextMenuPos(null) }}
              target="_blank"
            />
            <ContextMenuSub icon="drive_file_move" label="Move file" title="Move to">
              <ContextMenuItem
                icon="hard_drive"
                label="Drive"
                disabled={activeContextMenuFile.folderId === null}
                onClick={() => { moveFiles([activeContextMenuFile.id], null); setOpenMenuId(null); setContextMenuPos(null) }}
              />
              {folderTree.map((f) => (
                <ContextMenuTreeItem
                  key={f.id}
                  label={f.name}
                  depth={f.depth}
                  isLast={f.isLast}
                  ancestorsLast={f.ancestorsLast}
                  disabled={activeContextMenuFile.folderId === f.id}
                  onClick={() => { moveFiles([activeContextMenuFile.id], f.id); setOpenMenuId(null); setContextMenuPos(null) }}
                />
              ))}
            </ContextMenuSub>
            <ContextMenuDivider />
            <ContextMenuAction
              icon="delete"
              label="Delete"
              onClick={() => { handleDelete(activeContextMenuFile.id); setOpenMenuId(null); setContextMenuPos(null) }}
              disabled={deleteLoading === activeContextMenuFile.id}
              tone="danger"
            />
          </>
        )}
      </ContextMenu>

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
    </Tabs>
  )
}

export default function FilesPage() {
  return (
    <Suspense fallback={<div className="h-full w-full bg-white dark:bg-[#121212] animate-pulse" />}>
      <FilesPageInner />
    </Suspense>
  )
}
