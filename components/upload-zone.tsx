"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { shouldUseMultipart, generateEncryptionKey, uploadFileMultipart, DEFAULT_CHUNK_SIZE } from "@/lib/multipart"
import { useAuth } from "@/hooks/useAuth"
import { getTierLimits, FREE_LIMITS, getTierDelayMs, normalizeTier } from "@/lib/tier-limits"
import Turnstile from "react-turnstile"
// react-turnstile types omit `ref` but the library forwards it; cast once here
const TurnstileWithRef = Turnstile as React.ComponentType<
  React.ComponentProps<typeof Turnstile> & { ref?: React.RefObject<{ reset(): void }> }
>

import JSZip from "jszip"

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}



type UploadState = "idle" | "selected" | "zipping" | "encrypting" | "uploading" | "done" | "error" | "copied"

interface FileWithPreview {
  file: File
  id: string
  path?: string
}

interface UploadZoneProps {
  /** Files passed in from outside (e.g., a hidden file input on the parent
   * page). When provided, the zone seeds itself with these files and tries
   * to start the upload automatically once the security plumbing is ready. */
  initialFiles?: FileList | File[] | null
  /** Whether to automatically start uploading when seeded with initialFiles. Default is true. */
  autoStart?: boolean
  /** Upload mode. "files" uses multipart+encryption. "cdn" uses public R2 upload. */
  uploadType?: "files" | "cdn"
  /** Callback fired when a CDN upload completes. */
  onUploadComplete?: (asset: any) => void
  /** Callback fired whenever the upload state changes. */
  onUploadStateChange?: (state: UploadState) => void
  /** The current folder ID the user is in (if any). */
  currentFolderId?: string | null
}

export function UploadZone({ initialFiles, autoStart = true, uploadType = "files", onUploadComplete, onUploadStateChange, currentFolderId = null }: UploadZoneProps = {}) {
  const [state, setState] = useState<UploadState>("idle")
  const [autoStartArmed, setAutoStartArmed] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState(0)
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [pinEnabled, setPinEnabled] = useState(false)
  const [pin, setPin] = useState("")
  const [burnOnRead, setBurnOnRead] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string>("")
  const [turnstileReady, setTurnstileReady] = useState(process.env.NODE_ENV === "development")
  const [csrfToken, setCsrfToken] = useState<string>("")
  const [showQr, setShowQr] = useState(false)
  const [zipProgress, setZipProgress] = useState(0)
  const [customFilename, setCustomFilename] = useState("")
  const [zippedFile, setZippedFile] = useState<File | null>(null)
  const [note, setNote] = useState("")

  const [zipMultipleFiles, setZipMultipleFiles] = useState(true)
  const [trayCollapsed, setTrayCollapsed] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const turnstileRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resumeInputRef = useRef<HTMLInputElement>(null)
  const uploadStartTime = useRef<number>(0)
  const uploadedBytesRef = useRef<number>(0)

  // Interrupted upload session — persisted to localStorage to survive tab close
  const STORAGE_KEY = "hypa_interrupted_upload"
  const [interruptedSession, setInterruptedSession] = useState<{
    fileId: string
    uploadId: string
    r2Key: string
    totalParts: number
    chunkSize: number
    fileName: string
    fileSize: number
    keyBase64: string
    shareUrl: string
  } | null>(() => {
    if (typeof window === "undefined") return null
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [showResumePopup, setShowResumePopup] = useState(false)
  const [resuming, setResuming] = useState(false)

  // Prevent accidental tab closures during active uploads
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state === "uploading" || state === "encrypting") {
        e.preventDefault()
        e.returnValue = "" // Required by most browsers to show the prompt
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [state])

  useEffect(() => {
    if (onUploadStateChange) {
      onUploadStateChange(state)
    }
  }, [state, onUploadStateChange])

  // Persist interrupted session to localStorage
  useEffect(() => {
    if (interruptedSession) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(interruptedSession))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [interruptedSession])

  // On mount, check if there's a saved interrupted session and show the resume popup
  useEffect(() => {
    if (interruptedSession && state === "idle") {
      setShowResumePopup(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Tier-aware upload limits ───
  const { user } = useAuth()
  const tierLimits = user?.tier ? getTierLimits(user.tier) : FREE_LIMITS
  const uploadDelayMs = getTierDelayMs(normalizeTier(user?.tier))
  const MAX_SIZE = uploadType === "cdn" ? tierLimits.maxCdnFileSize : tierLimits.maxNormalUploadSize
  const MAX_FILES = uploadType === "cdn" ? tierLimits.maxCdnFilesPerUpload : tierLimits.maxFilesPerUpload
  const maxSizeLabel = formatFileSize(MAX_SIZE)

  useEffect(() => {
    async function fetchCsrfToken() {
      try {
        const response = await fetch('/api/v2/csrf')
        const data = await response.json()
        if (data.token) setCsrfToken(data.token)
      } catch (err) {
        console.error('Failed to fetch CSRF token:', err)
      }
    }
    fetchCsrfToken()
  }, [])

  // When the parent passes us a FileList (from a hidden file input), seed
  // the zone and arm the autostart so the upload fires as soon as CSRF +
  // Turnstile are ready, with no extra clicks from the user.
  const initialFilesProcessed = useRef(false)
  useEffect(() => {
    if (!initialFiles) return
    if (initialFilesProcessed.current) return
    initialFilesProcessed.current = true
    const list = initialFiles instanceof FileList
      ? initialFiles
      : (() => {
          const dt = new DataTransfer()
          for (const f of initialFiles) dt.items.add(f)
          return dt.files
        })()
    if (list.length === 0) return
    handleFiles(list)
    if (autoStart || uploadType === "cdn") {
      setAutoStartArmed(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFiles, autoStart, uploadType])

  const generateId = () => Math.random().toString(36).slice(2, 11)

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_SIZE) return `"${file.name}" exceeds ${maxSizeLabel}`
    return null
  }

  const getFilesFromEntry = async (entry: any, currentCount: number, collectedFiles: FileWithPreview[]): Promise<{ files: FileWithPreview[]; limitExceeded: boolean }> => {
    if (currentCount >= MAX_FILES) {
      return { files: [], limitExceeded: true }
    }
    
    if (entry.isFile) {
      const file = await new Promise<File>((resolve) => {
        entry.file((f: File) => resolve(f))
      })
      const error = validateFile(file)
      if (!error) {
        const cleanPath = entry.fullPath ? entry.fullPath.replace(/^\//, '') : file.name
        collectedFiles.push({ file, id: generateId(), path: cleanPath })
      }
      return { files: collectedFiles, limitExceeded: collectedFiles.length >= MAX_FILES }
    } else if (entry.isDirectory) {
      const reader = entry.createReader()
      const entries: any[] = await new Promise((resolve) => {
        reader.readEntries((e: any[]) => resolve(e))
      })
      
      for (const childEntry of entries) {
        const result = await getFilesFromEntry(childEntry, collectedFiles.length, collectedFiles)
        if (result.limitExceeded) {
          return { files: collectedFiles, limitExceeded: true }
        }
      }
    }
    
    return { files: collectedFiles, limitExceeded: false }
  }

  const handleFiles = useCallback(async (fileList: FileList | null, items?: DataTransferItemList | null) => {
    if (!fileList && !items) return
    
    let newFiles: FileWithPreview[] = []
    const errors: string[] = []
    let limitExceeded = false

    if (items && items.length > 0 && typeof items[0].webkitGetAsEntry === 'function') {
      for (let i = 0; i < items.length && !limitExceeded; i++) {
        const entry = items[i].webkitGetAsEntry()
        if (entry) {
          const result = await getFilesFromEntry(entry, files.length + newFiles.length, [])
          newFiles.push(...result.files)
          limitExceeded = result.limitExceeded
        }
      }
    } else if (fileList) {
      Array.from(fileList).forEach((f) => {
        if (files.length + newFiles.length >= MAX_FILES) {
          limitExceeded = true
          return
        }
        const error = validateFile(f)
        if (error) errors.push(error)
        else newFiles.push({ file: f, id: generateId(), path: f.name })
      })
    }
    
    if (limitExceeded) {
      setErrorMessage(`Maximum ${MAX_FILES} files allowed. Only the first ${MAX_FILES} files were selected.`)
    }
    
    if (errors.length > 0) {
      setErrorMessage(errors.slice(0, 3).join(". ") + (errors.length > 3 ? ` and ${errors.length - 3} more` : ""))
      setState("error")
      return
    }

    // Check total size of all files (existing + new)
    const existingSize = files.reduce((sum, f) => sum + f.file.size, 0)
    const newSize = newFiles.reduce((sum, f) => sum + f.file.size, 0)
    const totalSize = existingSize + newSize

    if (totalSize > MAX_SIZE) {
      setErrorMessage(`Total size exceeds ${maxSizeLabel} limit (${formatFileSize(totalSize)}). Remove some files.`)
      setState("error")
      return
    }

    if (newFiles.length > 0) {
      setFiles((prev) => [...prev, ...newFiles])
      setState("selected")
      setProgress(0)
      setCopied(false)
      if (!limitExceeded) setErrorMessage("")
    }
  }, [files])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      await handleFiles(e.dataTransfer.files, e.dataTransfer.items)
    },
    [handleFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only deactivate if leaving the element, not entering a child
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragActive(false)
    }
  }, [])

  // Global drag overlay
  const [globalDragActive, setGlobalDragActive] = useState(false)

  useEffect(() => {
    const handleWindowDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        setGlobalDragActive(true)
      }
    }
    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault()
    }
    const handleWindowDragLeave = (e: DragEvent) => {
      // Deactivate only when leaving the window
      if (e.relatedTarget === null) {
        setGlobalDragActive(false)
      }
    }
    const handleWindowDrop = (e: DragEvent) => {
      setGlobalDragActive(false)
    }

    window.addEventListener("dragenter", handleWindowDragEnter)
    window.addEventListener("dragover", handleWindowDragOver)
    window.addEventListener("dragleave", handleWindowDragLeave)
    window.addEventListener("drop", handleWindowDrop)

    return () => {
      window.removeEventListener("dragenter", handleWindowDragEnter)
      window.removeEventListener("dragover", handleWindowDragOver)
      window.removeEventListener("dragleave", handleWindowDragLeave)
      window.removeEventListener("drop", handleWindowDrop)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    if (inputRef.current) inputRef.current.value = ""
  }

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const newFiles = prev.filter((f) => f.id !== id)
      if (newFiles.length === 0) handleReset()
      return newFiles
    })
  }

  const getTotalSize = () => files.reduce((acc, f) => acc + f.file.size, 0)

  const createZipFile = async (archiveName?: string | null): Promise<File> => {
    const singleFileNoFolders = files.length === 1 && !files[0].path?.includes("/")
    if (singleFileNoFolders) return files[0].file
    
    const zip = new JSZip()
    
    files.forEach((fileWithId) => {
      const path = fileWithId.path || fileWithId.file.name
      zip.file(path, fileWithId.file)
    })
    
    const content = await zip.generateAsync(
      { type: "blob", compression: "DEFLATE" },
      (metadata) => setZipProgress(Math.round(metadata.percent))
    )

    const safeName = archiveName?.trim()
      ? archiveName.trim().replace(/\.zip$/i, "") + ".zip"
      : "hypastack-archive.zip"
    
    return new File([content], safeName, { type: "application/zip" })
  }

  function uploadWithXHR(
    url: string,
    method: string,
    body: File | FormData,
    onProgress: (percent: number) => void
  ): Promise<XMLHttpRequest> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress((e.loaded / e.total) * 100)
        }
      })
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(xhr)
        else reject(new Error(`HTTP ${xhr.status}`))
      })
      xhr.addEventListener("error", () => reject(new Error("Failed to fetch")))
      xhr.addEventListener("abort", () => reject(new Error("Aborted")))
      xhr.open(method, url)
      xhr.send(body)
    })
  }

  const uploadViaProxy = async (
    file: File,
    noteValue: string | null,
    filenameValue: string | null,
    proxyFileId: string,
    proxyTokenValue: string,
    currentCsrfToken: string,
    onProgress: (percent: number) => void
  ): Promise<string> => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("fileId", proxyFileId)
    formData.append("proxyToken", proxyTokenValue)
    formData.append("csrfToken", currentCsrfToken)
    if (pinEnabled && pin.length === 6) formData.append("pin", pin)
    if (burnOnRead) formData.append("burnOnRead", "true")
    if (noteValue) formData.append("note", noteValue)
    if (filenameValue) formData.append("customFilename", filenameValue)

    // Upload progress goes 0-90%, then we hold at 90% while server processes
    const xhr = await uploadWithXHR("/api/v2/upload-proxy", "POST", formData, (pct) => {
      onProgress(Math.min(90, pct))
    })

    const response = JSON.parse(xhr.responseText)
    if (!response.success) {
      throw new Error(response.error || "Proxy upload failed")
    }
    return response.shareUrl
  }

  const handleUpload = async () => {
    if (files.length === 0 || isUploading) return
    setErrorMessage("")

    let finalFilename: string | null = customFilename.trim() || null
    let finalNote: string | null = note.trim() || null
    
    // Always fetch a fresh CSRF token to avoid stale/expired tokens
    let currentCsrfToken = csrfToken
    try {
      const csrfRes = await fetch('/api/v2/csrf')
      const csrfData = await csrfRes.json()
      currentCsrfToken = csrfData.token || currentCsrfToken
      setCsrfToken(currentCsrfToken)
    } catch (err) {
      if (!currentCsrfToken) {
        setErrorMessage("Failed to get security token. Please refresh the page.")
        return
      }
    }
    
    setIsUploading(true)
    
    let fileToUpload: File | null = null
    const isMultipleOrNested = files.length > 1 || files.some(f => f.path?.includes("/"))
    const shouldZip = uploadType !== "cdn" && !currentFolderId && isMultipleOrNested && zipMultipleFiles

    if (shouldZip) {
      // Ensure the filename stored in the DB always carries the .zip extension
      if (finalFilename) {
        finalFilename = finalFilename.replace(/\.zip$/i, "") + ".zip"
      }
      setState("zipping")
      fileToUpload = await createZipFile(finalFilename)
      setZippedFile(fileToUpload)
    } else if (files.length > 0) {
      fileToUpload = files[0].file
      setZippedFile(null)
    }

    
    setState("uploading")
    setProgress(0)
    setUploadingIndex(0)
    uploadStartTime.current = Date.now()
    uploadedBytesRef.current = 0
    
    try {
      // Branch based on upload type
      if (uploadType === "cdn") {
        await handleCdnUpload(currentCsrfToken)
      } else {
        if (shouldZip && fileToUpload) {
          let url = ""
          if (shouldUseMultipart(fileToUpload.size)) {
            url = await handleMultipartUpload(fileToUpload, currentCsrfToken, finalFilename, finalNote)
          } else {
            url = await handleSingleUpload(fileToUpload, currentCsrfToken, finalFilename, finalNote)
          }
          setShareUrl(url)
        } else {
          // Loop over files and upload individually
          let urls: string[] = []
          for (let i = 0; i < files.length; i++) {
            if (i > 0 && uploadDelayMs > 0) {
              await new Promise((resolve) => setTimeout(resolve, uploadDelayMs))
            }
            setUploadingIndex(i)
            const f = files[i]
            let url = ""
            try {
              if (shouldUseMultipart(f.file.size)) {
                url = await handleMultipartUpload(f.file, currentCsrfToken, finalFilename, finalNote, f.path)
              } else {
                url = await handleSingleUpload(f.file, currentCsrfToken, finalFilename, finalNote, f.path)
              }
              urls.push(`${f.file.name}: ${url}`)
            } catch (err: any) {
              if (urls.length > 0) {
                setShareUrl(urls.join("\n"))
                setErrorMessage(err.message || "Upload partially failed.")
                setState("error")
                setIsUploading(false)
                return
              } else {
                throw err
              }
            }
          }
          setShareUrl(urls.join("\n"))
        }
      }
      setState("done")
      if (onUploadComplete && uploadType !== "cdn") {
        onUploadComplete(null)
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Upload failed. Please try again.")
      setState("error")
    } finally {
      setIsUploading(false)
    }
  }

  const handleCdnUpload = async (currentCsrfToken: string) => {
    const totalBytes = files.reduce((acc, f) => acc + f.file.size, 0)
    let uploadedBytes = 0

    // Prepare file metadata for all files upfront
    const filesMeta = files.map(f => ({
      file: f.file,
      fileName: f.file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_"),
      contentType: f.file.type || "application/octet-stream",
    }))

    // ── Step 1: Single batch init call → get all presigned URLs at once ──
    const initResponse = await fetch("/api/v2/cdn/upload-init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: filesMeta.map(f => ({
          fileName: f.fileName,
          fileSize: f.file.size,
          contentType: f.contentType,
        })),
        csrfToken: currentCsrfToken,
        folderId: currentFolderId,
      }),
    })

    if (!initResponse.ok) {
      const error = await initResponse.json()
      throw new Error(error.error || "Failed to initialize CDN upload")
    }

    const { files: initResults } = await initResponse.json()

    // ── Step 2: PUT each file directly to R2 (must be sequential for progress) ──
    // R2 PUTs go browser→R2 directly; we keep them sequential so progress is meaningful.
    const completedUploads: { cdnId: string; sanitizedName: string; contentType: string }[] = []

    for (let i = 0; i < files.length; i++) {
      if (i > 0 && uploadDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, uploadDelayMs))
      }
      setUploadingIndex(i)

      const { file } = files[i]
      const { cdnId, uploadUrl, sanitizedName, contentType } = initResults[i]

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = ((uploadedBytes + e.loaded) / totalBytes) * 100
            setProgress(pct)
          }
        })
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            uploadedBytes += file.size
            resolve()
          } else {
            reject(new Error(`R2 upload failed (status ${xhr.status})`))
          }
        })
        xhr.addEventListener("error", () => reject(new Error("Network error uploading to R2")))
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")))

        xhr.open("PUT", uploadUrl)
        xhr.setRequestHeader("Content-Type", contentType)
        xhr.setRequestHeader("Cache-Control", "public, max-age=31536000, immutable")
        xhr.send(file)
      })

      completedUploads.push({ cdnId, sanitizedName, contentType })
    }

    // ── Step 3: Single batch complete call → parallel HEAD checks + one DB insert ──
    const completeRes = await fetch("/api/v2/cdn/upload-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: completedUploads.map(u => ({
          cdnId: u.cdnId,
          sanitizedName: u.sanitizedName,
          contentType: u.contentType,
          folderId: currentFolderId,
        })),
      }),
    })

    if (!completeRes.ok) {
      const error = await completeRes.json()
      throw new Error(error.error || "Failed to complete CDN upload")
    }

    const { files: completedAssets } = await completeRes.json()

    // Fire onUploadComplete for each asset and build share URLs
    const urls: string[] = []
    for (const asset of completedAssets) {
      urls.push(`${asset.fileName}: ${asset.cdnUrl}`)
      if (onUploadComplete) {
        onUploadComplete({
          id: asset.id,
          name: asset.fileName,
          size: asset.fileSize,
          contentType: asset.contentType,
          cdnUrl: asset.cdnUrl,
          createdAt: new Date().toISOString(),
        })
      }
    }

    setShareUrl(urls.join("\n"))
  }



  const handleSingleUpload = async (
    fileToUpload: File,
    currentCsrfToken: string,
    finalFilename: string | null,
    finalNote: string | null,
    filePath?: string
  ): Promise<string> => {
    // Generate encryption key in browser
    const { key: encKey, keyBase64 } = await generateEncryptionKey()

    // Encrypt the entire file as a single chunk
    const plaintext = await fileToUpload.arrayBuffer()
    const { encryptChunk } = await import("@/lib/multipart")
    const encrypted = await encryptChunk(encKey, plaintext)
    const encryptedBlob = new File([encrypted], fileToUpload.name, {
      type: fileToUpload.type || "application/octet-stream",
    })

    const initResponse = await fetch("/api/v2/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: fileToUpload.name,
        fileSize: encrypted.byteLength,
        contentType: "application/octet-stream",
        pin: pinEnabled && pin.length === 6 ? pin : null,
        burnOnRead,
        turnstileToken,
        csrfToken: currentCsrfToken,
        customFilename: finalFilename,
        note: finalNote,
        path: filePath || (fileToUpload as any).path,
        folderId: currentFolderId,
      }),
    })

    if (!initResponse.ok) {
      const error = await initResponse.json()
      throw new Error(error.error || "Failed to initialize upload")
    }

    const { fileId, uploadUrl, shareUrl: url, proxyToken } = await initResponse.json()

    try {
      // Direct R2 upload with real progress tracking
      await uploadWithXHR(uploadUrl, "PUT", encryptedBlob, (pct) => setProgress(pct))
      setProgress(100)

      const completeResponse = await fetch("/api/v2/upload-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      })

      if (!completeResponse.ok) {
        const error = await completeResponse.json()
        throw new Error(error.error || "Upload validation failed")
      }

      // Append encryption key as URL hash fragment (never sent to server)
      return `${url}#key=${keyBase64}`
    } catch (fetchError: any) {
      const isCORSError = fetchError.message === "Failed to fetch" || fetchError.name === "TypeError"
      if (isCORSError) {
        setProgress(0)
        const proxyUrl = await uploadViaProxy(encryptedBlob, finalNote, finalFilename, fileId, proxyToken, currentCsrfToken, (pct) => setProgress(pct))
        setProgress(100)
        return `${proxyUrl}#key=${keyBase64}`
      } else {
        throw fetchError
      }
    }
  }


  const handleMultipartUpload = async (
    fileToUpload: File,
    currentCsrfToken: string,
    finalFilename: string | null,
    finalNote: string | null,
    filePath?: string
  ): Promise<string> => {
    // Step 1: Generate encryption key in browser RAM
    const { key: encKey, keyBase64 } = await generateEncryptionKey()

    // Step 2: Request batch presigned URLs from backend
    const initResponse = await fetch("/api/v2/upload-multipart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: fileToUpload.name,
        fileSize: fileToUpload.size,
        contentType: fileToUpload.type || "application/octet-stream",
        pin: pinEnabled && pin.length === 6 ? pin : null,
        burnOnRead,
        csrfToken: currentCsrfToken,
        customFilename: finalFilename,
        note: finalNote,
        chunkSize: DEFAULT_CHUNK_SIZE,
        path: filePath || (fileToUpload as any).path,
        folderId: currentFolderId,
      }),
    })

    if (!initResponse.ok) {
      const error = await initResponse.json()
      throw new Error(error.error || "Failed to initialize multipart upload")
    }

    const { fileId, uploadId, presignedUrls, shareUrl: url } = await initResponse.json()
    const totalParts = presignedUrls.length

    // Save session info for potential resume
    const sessionInfo = {
      fileId,
      uploadId,
      r2Key: "", // Server knows this
      totalParts,
      chunkSize: DEFAULT_CHUNK_SIZE,
      fileName: fileToUpload.name,
      fileSize: fileToUpload.size,
      keyBase64,
      shareUrl: `${url}#key=${keyBase64}`,
    }
    setInterruptedSession(sessionInfo)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionInfo)) // Synchronous save to survive immediate tab close

    // Step 3: Encrypt + upload chunks
    try {
      let etags: any[]

      // ─── Tauri native path: Rust-side AES-NI + parallel reqwest ───
      const tauriInternals = (window as any).__TAURI_INTERNALS__
      // File inputs in Tauri WebView expose the real filesystem path
      const filePath = (fileToUpload as any).path as string | undefined

      if (tauriInternals && filePath) {
        const { invoke } = await import("@tauri-apps/api/core")
        const { listen } = await import("@tauri-apps/api/event")

        // Listen for Rust-side progress events
        const unlisten = await listen<{
          percent: number
          bytes_uploaded: number
          total_bytes: number
          phase: string
          parts_done: number
          total_parts: number
        }>("upload-progress", (event) => {
          setProgress(Math.min(95, event.payload.percent))
        })

        try {
          etags = await invoke<string[]>("native_upload_multipart", {
            filePath,
            presignedUrls,
            keyBase64,
            chunkSize: DEFAULT_CHUNK_SIZE,
          })
        } finally {
          unlisten()
        }
      } else {
        // ─── Browser fallback: Web Crypto + XHR ───
        const result = await uploadFileMultipart({
          file: fileToUpload,
          encryptionKey: encKey,
          presignedUrls,
          chunkSize: DEFAULT_CHUNK_SIZE,
          onProgress: (pct) => setProgress(Math.min(95, pct)),
        })
        etags = result.etags
      }

      // Step 4: Tell server to finalize the multipart upload on R2
      const completeResponse = await fetch("/api/v2/upload-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          uploadId,
          parts: etags,
        }),
      })

      if (!completeResponse.ok) {
        const error = await completeResponse.json()
        throw new Error(error.error || "Multipart upload finalization failed")
      }

      setProgress(100)
      // Clear interrupted session on success
      setInterruptedSession(null)
      // Append encryption key as URL hash fragment (never sent to server)
      return `${url}#key=${keyBase64}`
    } catch (uploadError: any) {
      // Keep interruptedSession set so resume popup can appear
      console.error("[Upload] Multipart upload interrupted:", uploadError.message)
      throw uploadError
    }
  }

  // Listen for context menu native uploads
  useEffect(() => {
    const handleNativeUpload = (e: Event) => {
      const customEvent = e as CustomEvent<{ filePath: string; name: string; size: number }>
      const { filePath, name, size } = customEvent.detail
      
      // Create a dummy File object. The native engine only cares about the path,
      // but the UI needs name and size.
      const dummyFile = new File([""], name, { type: "application/octet-stream" })
      Object.defineProperty(dummyFile, "size", { value: size })
      Object.defineProperty(dummyFile, "path", { value: filePath })

      setFiles([{ file: dummyFile, id: Math.random().toString(36).slice(2, 11), path: filePath }])
      setState("selected")
      setAutoStartArmed(true)
    }

    window.addEventListener("hypadrive:upload", handleNativeUpload)
    return () => window.removeEventListener("hypadrive:upload", handleNativeUpload)
  }, [])

  // Autostart trigger: when the parent seeded us via initialFiles, kick off
  // the upload as soon as CSRF + (in prod) Turnstile are ready, so the user
  // never has to click a second "Upload" button.
  useEffect(() => {
    if (!autoStartArmed) return
    if (state !== "selected" || isUploading) return
    if (!csrfToken) return
    if (process.env.NODE_ENV !== "development" && !turnstileToken) return
    setAutoStartArmed(false)
    handleUpload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartArmed, state, isUploading, csrfToken, turnstileToken])

  // Native Desktop Integration: Send OS notification and auto-copy link when upload finishes
  useEffect(() => {
    if (state === "done" && shareUrl && (window as any).__TAURI_INTERNALS__) {
      (async () => {
        try {
          const { sendNotification } = await import('@tauri-apps/plugin-notification')
          const { writeText } = await import('@tauri-apps/plugin-clipboard-manager')
          
          await writeText(shareUrl)
          sendNotification({
            title: 'Hypastack Upload Complete',
            body: 'Your file has been uploaded. The link is copied to your clipboard.',
          })
          setCopied(true)
          setTimeout(() => setCopied(false), 3000)
        } catch (e) {
          console.error("[Desktop] Failed to trigger native notification/clipboard", e)
        }
      })()
    }
  }, [state, shareUrl])

  const handleCopy = async () => {
    if (!shareUrl) return
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { writeText } = await import('@tauri-apps/plugin-clipboard-manager')
        await writeText(shareUrl)
      } else {
        await navigator.clipboard.writeText(shareUrl)
      }
    } catch (e) {}
    setCopied(true)
    if (onUploadStateChange) onUploadStateChange("copied")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    // If a multipart upload was in progress, offer resume before wiping
    if (interruptedSession) {
      setShowResumePopup(true)
      return
    }
    doFullReset()
  }

  const handleCancelDuringUpload = () => {
    // Capture interrupted session info before resetting UI
    // The interruptedSession is set in handleMultipartUpload on failure/cancel
    if (interruptedSession) {
      setShowResumePopup(true)
      setIsUploading(false)
      setState("idle")
      setProgress(0)
      return
    }
    doFullReset()
  }

  const doFullReset = () => {
    setState("idle")
    setFiles([])
    setProgress(0)
    setCopied(false)
    setShareUrl("")
    setErrorMessage("")
    setIsUploading(false)
    setZipProgress(0)
    setZippedFile(null)
    setPinEnabled(false)
    setPin("")
    setBurnOnRead(false)
    setTurnstileToken("")
    setTurnstileReady(process.env.NODE_ENV === "development")
    setShowQr(false)
    setCustomFilename("")
    setNote("")

    setInterruptedSession(null)
    setShowResumePopup(false)
    setResuming(false)
    fetch("/api/v2/csrf").then((r) => r.json()).then((d) => setCsrfToken(d.token || ""))
    if (turnstileRef.current) turnstileRef.current.reset()
    if (inputRef.current) inputRef.current.value = ""
    initialFilesProcessed.current = false
  }

  const handleAbortUpload = async () => {
    if (!interruptedSession) return
    try {
      await fetch("/api/v2/upload-multipart/abort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: interruptedSession.fileId,
          uploadId: interruptedSession.uploadId,
        }),
      })
    } catch (e) {
      console.error("[Upload] Abort failed:", e)
    }
    doFullReset()
  }

  const handleResumeUpload = () => {
    // Trigger file picker for resume
    resumeInputRef.current?.click()
  }

  const handleResumeFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !interruptedSession) return

    // Validate it's the same file (name + size)
    if (file.name !== interruptedSession.fileName || file.size !== interruptedSession.fileSize) {
      setErrorMessage(
        `Please select the same file: "${interruptedSession.fileName}" (${(interruptedSession.fileSize / 1024 / 1024).toFixed(1)} MB)`
      )
      setState("error")
      setShowResumePopup(false)
      return
    }

    setShowResumePopup(false)
    setResuming(true)
    setState("uploading")
    setIsUploading(true)
    setProgress(0)
    setErrorMessage("")

    try {
      // Ask server which parts are already uploaded
      const resumeRes = await fetch("/api/v2/upload-multipart/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: interruptedSession.fileId,
          uploadId: interruptedSession.uploadId,
          totalParts: interruptedSession.totalParts,
          chunkSize: interruptedSession.chunkSize,
        }),
      })

      if (!resumeRes.ok) {
        const err = await resumeRes.json()
        throw new Error(err.error || "Resume failed")
      }

      const resumeData = await resumeRes.json()
      const { uploadedParts, missingParts } = resumeData

      // Import the encryption key from the interrupted session
      const { importKeyFromBase64, readFileSlice, encryptChunk, uploadChunkToR2 } = await import("@/lib/multipart")
      const encKey = await importKeyFromBase64(interruptedSession.keyBase64)

      const chunkSize = interruptedSession.chunkSize
      const totalBytes = file.size
      const uploadedBytes = uploadedParts.length * chunkSize // approximate

      // Collect all ETags (existing + new)
      const allEtags: { partNumber: number; etag: string }[] = [
        ...uploadedParts,
      ]

      // Show progress accounting for already-uploaded parts
      const baseProgress = (uploadedParts.length / interruptedSession.totalParts) * 100
      setProgress(baseProgress)

      // Upload only missing parts (parallel)
      const MAX_CONCURRENT = 6
      let nextIdx = 0
      const chunkProgress = new Float64Array(missingParts.length)

      const reportProgress = () => {
        let done = 0
        for (let i = 0; i < chunkProgress.length; i++) done += chunkProgress[i]
        const missingBytes = missingParts.length * chunkSize
        const pct = baseProgress + (done / Math.max(missingBytes, 1)) * (100 - baseProgress)
        setProgress(Math.min(99, pct))
      }

      const worker = async () => {
        while (true) {
          const idx = nextIdx++
          if (idx >= missingParts.length) break

          const { partNumber, presignedUrl } = missingParts[idx]
          const start = (partNumber - 1) * chunkSize
          const end = Math.min(start + chunkSize, file.size)
          const chunkBytes = end - start

          const plaintext = await readFileSlice(file, start, end)
          const encrypted = await encryptChunk(encKey, plaintext)
          const etag = await uploadChunkToR2(
            presignedUrl,
            encrypted,
            (loaded, total) => {
              chunkProgress[idx] = (loaded / total) * chunkBytes
              reportProgress()
            }
          )

          allEtags.push({ partNumber, etag })
          chunkProgress[idx] = chunkBytes
          reportProgress()
        }
      }

      const workerCount = Math.min(MAX_CONCURRENT, missingParts.length)
      const workers: Promise<void>[] = []
      for (let i = 0; i < workerCount; i++) workers.push(worker())
      await Promise.all(workers)

      // Sort ETags by part number
      allEtags.sort((a, b) => a.partNumber - b.partNumber)

      // Complete the multipart upload
      const completeRes = await fetch("/api/v2/upload-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: interruptedSession.fileId,
          uploadId: interruptedSession.uploadId,
          parts: allEtags,
        }),
      })

      if (!completeRes.ok) {
        const err = await completeRes.json()
        throw new Error(err.error || "Completion failed")
      }

      setProgress(100)
      setState("done")
      setShareUrl(interruptedSession.shareUrl)
      setInterruptedSession(null)
      setResuming(false)
    } catch (err: any) {
      console.error("[Upload] Resume failed:", err)
      setErrorMessage(err.message || "Resume failed")
      setState("error")
      setIsUploading(false)
      setResuming(false)
    }
  }

  const getUploadStats = () => {
    const totalBytes = files.reduce((acc, f) => acc + f.file.size, 0)
    let uploadedPastFilesBytes = 0
    for (let i = 0; i < uploadingIndex; i++) {
      uploadedPastFilesBytes += files[i].file.size
    }
    const currentFileBytes = files[uploadingIndex]?.file.size || 0
    const bytesUploaded = uploadedPastFilesBytes + (currentFileBytes * (progress / 100))

    const elapsed = (Date.now() - uploadStartTime.current) / 1000
    if (elapsed < 1 || bytesUploaded === 0) return "Starting..."

    const speed = bytesUploaded / elapsed
    const remaining = totalBytes - bytesUploaded
    const etaSeconds = Math.ceil(remaining / speed)
    const speedStr = speed >= 1024 * 1024
      ? `${(speed / (1024 * 1024)).toFixed(1)} MB/s`
      : `${(speed / 1024).toFixed(0)} KB/s`

    const progressStr = `${formatFileSize(bytesUploaded)} / ${formatFileSize(totalBytes)}`

    if (etaSeconds < 5) return `${progressStr} • ${speedStr} • Almost done`
    if (etaSeconds < 60) return `${progressStr} • ${speedStr} • ${etaSeconds}s left`
    const mins = Math.floor(etaSeconds / 60)
    const secs = etaSeconds % 60
    return `${progressStr} • ${speedStr} • ${mins}m ${secs}s left`
  }

  const totalSize = getTotalSize()
  const isMultiFile = files.length > 1 || files.some(f => f.path?.includes("/"))

  const GlobalOverlay = () => (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        setGlobalDragActive(false)
        handleFiles(e.dataTransfer.files, e.dataTransfer.items)
      }}
      onDragLeave={(e) => {
        if (e.relatedTarget === null) setGlobalDragActive(false)
      }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-secondary border border-border">
          <MIcon name="cloud_upload" size={42} className="text-primary" />
        </div>
        <p className="text-2xl font-semibold text-white">Drop to Basedrop</p>
        <p className="text-sm text-muted-foreground">Release your files anywhere to upload</p>
      </div>
    </div>
  )

  // Always-rendered drop area (the dashed Dropbox-style empty panel).
  const dropPanel = (
    <div
      onDrop={state === "idle" ? handleDrop : undefined}
      onDragOver={state === "idle" ? handleDragOver : undefined}
      onDragLeave={state === "idle" ? handleDragLeave : undefined}
      onClick={state === "idle" ? () => inputRef.current?.click() : undefined}
      role={state === "idle" ? "button" : undefined}
      tabIndex={state === "idle" ? 0 : undefined}
      onKeyDown={(e) => {
        if (state === "idle" && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      className={`group relative rounded-[20px] transition-all min-h-[520px] sm:min-h-[580px] md:min-h-[660px] w-full flex flex-col justify-end items-start px-5 pb-6 pt-10 sm:px-8 sm:pb-8 sm:pt-12 ${ state === "idle" ? "cursor-pointer bg-transparent hover:bg-[#1f1f1f]/20" : "cursor-default bg-transparent" }`}
    >
      {/* Centered visual */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative h-44 w-44 opacity-[0.5]">
          <div className="absolute left-1/2 top-1/2 -translate-x-[60%] -translate-y-1/2 -rotate-12 h-36 w-28 rounded-[20px] bg-[#1f1f1f]" />
          <div className="absolute left-1/2 top-1/2 -translate-x-[40%] -translate-y-[55%] rotate-6 h-36 w-28 rounded-[20px] bg-[#2c2c30] flex items-center justify-center">
            <MIcon name="file_copy" size={50} className="text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Bottom-left content */}
      <div className="relative z-10 mt-auto">
        <div className="flex items-center gap-1.5 text-foreground">
          <span className="text-lg font-medium sm:text-2xl">
            {dragActive ? "Release to" : "Drop anything here to"}
          </span>
          <span className="inline-flex items-center gap-1 text-lg font-semibold underline decoration-foreground underline-offset-4 sm:text-2xl">
            upload
            <MIcon name="expand_more" size={22} />
          </span>
        </div>

        <p className="mt-2 text-sm font-normal text-muted-foreground sm:text-base">
          Max 5 files · Folders auto-zip · 500MB per file
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              inputRef.current?.click()
            }}
            disabled={state !== "idle" && state !== "selected"}
            className="inline-flex items-center gap-2 rounded-[16px] bg-[#2c2c30] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3a3a3b] transition-colors disabled:cursor-not-allowed"
          >
            <MIcon name="cloud_upload" size={18} />
            Choose a file
          </button>
          <a
            href="/manage/files"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-2 rounded-[16px] bg-[#2c2c30] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3a3a3b] transition-colors"
          >
            <MIcon name="create_new_folder" size={18} />
            Browse files
          </a>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )

  // Bottom-right uploads tray (Dropbox-style).
  const trayVisible = state !== "idle"

  return (
    <>
      {globalDragActive && <GlobalOverlay />}
      {!initialFiles && dropPanel}

      <AnimatePresence>
        {trayVisible && (
          <motion.div
            initial={{ opacity: 0, x: 500 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 500 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-40 sm:bottom-4 sm:right-4 sm:left-auto w-full sm:w-[480px] sm:max-w-[calc(100vw-2rem)] rounded-t-[20px] sm:rounded-[20px] bg-[#1f1f1f] font-sans mb-8 sm:mb-0"
            style={{ padding: 4, boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 2px 6px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.22)' }}
          >
            <div className="w-full h-full bg-[#111111] overflow-hidden flex flex-col sm:rounded-[16px] rounded-t-[16px]">
          <div className="flex flex-col gap-2 px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-semibold text-white tracking-tight" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>Uploads</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75"
                  style={{ height: 28, paddingLeft: 10, paddingRight: 10, borderRadius: 12, fontSize: 13, fontWeight: 500, color: '#a1a1aa' }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setTrayCollapsed((v) => !v)}
                  className="p-1 rounded-md text-[#666] hover:text-[#999] hover:bg-[#1e1e22] transition-colors"
                  aria-label={trayCollapsed ? "Expand uploads" : "Collapse uploads"}
                >
                  {trayCollapsed ? <MIcon name="expand_less" size={18} /> : <MIcon name="expand_more" size={18} />}
                </button>
              </div>
            </div>

            <p className="text-[13px] text-[#666] font-normal">
              Uploading to <span className="text-[#a1a1aa] font-medium">{uploadType === "cdn" ? "CDN" : "Files"}</span>
            </p>
            {normalizeTier(user?.tier) !== "ultimate" && (
              <p className="text-[12px] text-[#888] font-normal">
                For higher upload and deletion speeds, <a href="/pricing" className="text-[#a1a1aa] underline hover:text-white transition-colors">upgrade your plan</a>.
              </p>
            )}
            {uploadType !== "cdn" && state === "done" && shareUrl && shareUrl.includes("\n") && (
              <div className="mt-1 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                <div className="flex items-start gap-2">
                  <MIcon name="warning" size={16} className="mt-0.5 shrink-0" />
                  <div className="flex flex-col text-[12px] leading-snug">
                    <span className="font-semibold mb-0.5">Copy all links!</span>
                    <span>If you don't copy the links, all files that you've shared will be unrecoverable.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!trayCollapsed && (
            <>
              <div className="max-h-[480px] overflow-y-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {state === "zipping" && (
                  <div className="px-5 py-3 flex items-center gap-3">
                    <MIcon name="folder_zip" size={18} className="text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-foreground">Zipping {files.length} items…</p>
                      <div className="mt-1.5 h-1 w-full bg-secondary">
                        <div className="h-full bg-[#9b9b9b] transition-all" style={{ width: `${zipProgress}%` }} />
                      </div>
                    </div>
                  </div>
                )}

                {(state === "selected" || state === "uploading" || state === "done" || state === "error") && (
                  <>
                    {/* When zipped: show single zip row only */}
                    {zippedFile ? (
                      <div className="relative flex items-center gap-3 group" style={{ padding: '10px 16px' }}>
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-medium text-white truncate leading-tight">
                            {zippedFile.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' as const, color: '#b4b4b8', backgroundColor: '#1f1f1f', padding: '2px 6px', borderRadius: 5 }}>ZIP</span>
                            <span style={{ fontSize: 13, color: '#a1a1aa' }}>
                              {state === "done" ? `Uploaded · ${files.length} file${files.length !== 1 ? 's' : ''} archived` : state === "error" ? "Failed" : state === "uploading" ? `${formatFileSize(zippedFile.size * (progress / 100))} / ${formatFileSize(zippedFile.size)}` : "Pending"}
                            </span>
                          </div>
                        </div>
                        {state === "done" && (
                          <div className="shrink-0">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                              className="hover:bg-[#e2e2e8] active:scale-[0.97] transition-all duration-75"
                              style={{ height: 28, paddingLeft: 10, paddingRight: 10, borderRadius: 10, fontSize: 13, fontWeight: 500, color: '#0a0a0a', backgroundColor: '#ffffff' }}
                            >
                              {copied ? "Copied" : "Copy link"}
                            </button>
                          </div>
                        )}
                        {state === "uploading" && (
                          <div className="absolute left-4 right-4" style={{ bottom: 4, height: 2, borderRadius: 1, backgroundColor: '#1a1a1a' }}>
                            <div style={{ height: '100%', width: `${progress}%`, borderRadius: 1, backgroundColor: '#888', transition: 'width 0.3s ease' }} />
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Normal per-file rows */
                      files.map((f, index) => (
                        <div key={f.id} className="relative flex items-center gap-3 group" style={{ padding: '10px 16px' }}>
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-medium text-white truncate leading-tight">
                              {f.path || f.file.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' as const, color: '#b4b4b8', backgroundColor: '#1f1f1f', padding: '2px 6px', borderRadius: 5 }}>
                                {f.file.name.split(".").pop()?.substring(0, 4) || "FILE"}
                              </span>
                              <span style={{ fontSize: 13, color: '#a1a1aa' }}>
                                {state === "done" ? "Uploaded" : state === "error" ? (index < uploadingIndex ? "Uploaded" : index === uploadingIndex ? "Failed" : "Skipped") : state === "uploading" ? (index < uploadingIndex ? "Uploaded" : index === uploadingIndex ? `${formatFileSize(f.file.size * (progress / 100))} / ${formatFileSize(f.file.size)}` : "Pending") : "Pending"}
                              </span>
                            </div>
                          </div>
                          {state === "done" && (
                            <div className="shrink-0">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                                className="hover:bg-[#e2e2e8] active:scale-[0.97] transition-all duration-75"
                                style={{ height: 28, paddingLeft: 10, paddingRight: 10, borderRadius: 10, fontSize: 13, fontWeight: 500, color: '#0a0a0a', backgroundColor: '#ffffff' }}
                              >
                                {copied ? "Copied" : "Copy link"}
                              </button>
                            </div>
                          )}
                          {(state === "uploading" && index === uploadingIndex) && (
                            <div className="absolute left-4 right-4" style={{ bottom: 4, height: 2, borderRadius: 1, backgroundColor: '#1a1a1a' }}>
                              <div style={{ height: '100%', width: `${progress}%`, borderRadius: 1, backgroundColor: '#888', transition: 'width 0.3s ease' }} />
                            </div>
                          )}
                          {(state === "uploading" && index < uploadingIndex) && (
                            <div className="absolute left-4 right-4" style={{ bottom: 4, height: 2, borderRadius: 1, backgroundColor: '#1a1a1a' }}>
                              <div style={{ height: '100%', width: '100%', borderRadius: 1, backgroundColor: '#888', transition: 'width 0.3s ease' }} />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </>
                )}

                {state === "selected" && uploadType !== "cdn" && (
                  <div style={{ margin: '0 12px 8px', backgroundColor: '#171717', borderRadius: 16 }}>

                    {/* Burn toggle */}
                    <div
                      className="flex items-center justify-between cursor-pointer hover:bg-[#1a1a1a] transition-all duration-75"
                      style={{ height: 38, paddingLeft: 12, paddingRight: 10, borderRadius: 12 }}
                      onClick={() => setBurnOnRead(!burnOnRead)}
                    >
                      <div className="flex items-center gap-2.5">
                        <MIcon name="local_fire_department" size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                        <span style={{ fontSize: 13, color: '#ccc' }}>Burn after download</span>
                      </div>
                      <div
                        className="relative shrink-0 transition-colors"
                        style={{ width: 34, height: 20, borderRadius: 10, backgroundColor: burnOnRead ? '#9b9b9b' : '#2a2a2a', border: burnOnRead ? 'none' : '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <div
                          className="absolute top-[3px] transition-transform bg-white"
                          style={{ width: 14, height: 14, borderRadius: 7, left: burnOnRead ? 17 : 3 }}
                        />
                      </div>
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, margin: '4px 8px', backgroundColor: 'rgba(255,255,255,0.06)' }} />

                    {/* Rename / Archive name */}
                    {isMultiFile ? (
                      <>
                        <div
                          className="flex items-center justify-between cursor-pointer hover:bg-[#1a1a1a] transition-all duration-75"
                          style={{ height: 38, paddingLeft: 12, paddingRight: 10, borderRadius: 12 }}
                          onClick={() => setZipMultipleFiles(!zipMultipleFiles)}
                        >
                          <div className="flex items-center gap-2.5">
                            <MIcon name="folder_zip" size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                            <span style={{ fontSize: 13, color: '#ccc' }}>Zip the files</span>
                          </div>
                          <div
                            className="relative shrink-0 transition-colors"
                            style={{ width: 34, height: 20, borderRadius: 10, backgroundColor: zipMultipleFiles ? '#9b9b9b' : '#2a2a2a', border: zipMultipleFiles ? 'none' : '1px solid rgba(255,255,255,0.08)' }}
                          >
                            <div
                              className="absolute top-[3px] transition-transform bg-white"
                              style={{ width: 14, height: 14, borderRadius: 7, left: zipMultipleFiles ? 17 : 3 }}
                            />
                          </div>
                        </div>
                        <div style={{ padding: '0 12px 6px' }}>
                          <p style={{ fontSize: 11, color: '#666', lineHeight: 1.4 }}>
                            Uploading multiple files in a ZIP counts as 1 file, uploading multiple files without ZIP'ing, will count normally.
                          </p>
                        </div>
                        <div style={{ height: 1, margin: '4px 8px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
                        {zipMultipleFiles && (
                          <>
                            <div style={{ padding: '6px 8px 4px' }}>
                              <div className="flex items-center gap-2 mb-2" style={{ paddingLeft: 4 }}>
                                <MIcon name="folder_zip" size={15} style={{ color: 'rgba(255,255,255,0.4)' }} />
                                <span style={{ fontSize: 12, fontWeight: 500, color: '#888' }}>Archive name</span>
                              </div>
                              <input
                                type="text"
                                value={customFilename}
                                onChange={(e) => setCustomFilename(e.target.value)}
                                placeholder="hypastack-archive"
                                className="w-full placeholder:text-[#444] focus:outline-none focus:border-[rgba(255,255,255,0.12)]"
                                style={{ height: 34, paddingLeft: 10, paddingRight: 10, borderRadius: 10, backgroundColor: '#1f1f1f', border: '1px solid rgba(255,255,255,0.06)', fontSize: 13, color: '#e3e3e3' }}
                              />
                            </div>
                            <div style={{ height: 1, margin: '4px 8px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <div style={{ padding: '6px 8px 4px' }}>
                          <div className="flex items-center gap-2 mb-2" style={{ paddingLeft: 4 }}>
                            <MIcon name="edit" size={15} style={{ color: 'rgba(255,255,255,0.4)' }} />
                            <span style={{ fontSize: 12, fontWeight: 500, color: '#888' }}>Rename file</span>
                          </div>
                          <input
                            type="text"
                            value={customFilename}
                            onChange={(e) => setCustomFilename(e.target.value)}
                            placeholder={files[0]?.file.name || "example.pdf"}
                            className="w-full placeholder:text-[#444] focus:outline-none focus:border-[rgba(255,255,255,0.12)]"
                            style={{ height: 34, paddingLeft: 10, paddingRight: 10, borderRadius: 10, backgroundColor: '#1f1f1f', border: '1px solid rgba(255,255,255,0.06)', fontSize: 13, color: '#e3e3e3' }}
                          />
                        </div>
                        <div style={{ height: 1, margin: '4px 8px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
                      </>
                    )}

                    {/* Note */}
                    <div style={{ padding: '6px 8px 6px' }}>
                      <div className="flex items-center gap-2 mb-2" style={{ paddingLeft: 4 }}>
                        <MIcon name="article" size={15} style={{ color: 'rgba(255,255,255,0.4)' }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#888' }}>Note</span>
                      </div>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Optional message…"
                        maxLength={100}
                        rows={2}
                        className="w-full placeholder:text-[#444] focus:outline-none focus:border-[rgba(255,255,255,0.12)] resize-none"
                        style={{ paddingLeft: 10, paddingRight: 10, paddingTop: 8, paddingBottom: 8, borderRadius: 10, backgroundColor: '#1f1f1f', border: '1px solid rgba(255,255,255,0.06)', fontSize: 13, color: '#e3e3e3' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {state === "selected" && uploadType !== "cdn" && process.env.NODE_ENV !== "development" && (
                <div className="flex justify-center px-4 py-3 border-t border-border/40 bg-secondary/10">
                  <TurnstileWithRef
                    ref={turnstileRef}
                    sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                    onVerify={(token) => { setTurnstileToken(token); setTurnstileReady(true); }}
                    onExpire={() => { setTurnstileToken(""); setTurnstileReady(false); }}
                    theme="dark"
                  />
                </div>
              )}

              {/* Banner Footer */}
              <div className="relative overflow-hidden bg-transparent">
                
                <div className="relative z-10 flex items-center justify-between p-4 pl-5">
                  <div className="flex items-center gap-3">
                    <MIcon name="cloud_upload" size={22} className={`shrink-0 ${state === "uploading" ? "text-white" : "text-[#888]"}`} />
                    <div className="flex flex-col">
                      <span className={`text-[15px] font-semibold ${state === "uploading" ? "text-white" : "text-white"}`}>
                        {state === "done" ? "Upload complete" : state === "uploading" ? `Uploading... (${uploadingIndex}/${files.length - uploadingIndex})` : state === "error" ? "Upload failed" : `Ready to upload ${files.length} item${files.length !== 1 ? "s" : ""}`}
                      </span>
                      <span className={`text-[13px] ${state === "uploading" ? "text-white/60" : "text-[#666]"}`}>
                        {state === "done" ? "All files uploaded" : state === "uploading" ? getUploadStats() : state === "error" ? errorMessage : "Click start to begin"}
                      </span>
                    </div>
                  </div>
                  
                  {state === "selected" ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleReset}
                        className="hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75"
                        style={{ height: 34, paddingLeft: 12, paddingRight: 12, borderRadius: 16, fontSize: 13, fontWeight: 500, color: '#888' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleUpload}
                        disabled={isUploading || (uploadType !== "cdn" && ((pinEnabled && pin.length !== 6) || !turnstileReady))}
                        className="hover:bg-[#e2e2e8] active:scale-[0.97] transition-all duration-75 disabled:opacity-50"
                        style={{ height: 34, paddingLeft: 14, paddingRight: 14, borderRadius: 16, fontSize: 13, fontWeight: 600, color: '#0a0a0a', backgroundColor: '#ffffff' }}
                      >
                        Start
                      </button>
                    </div>
                  ) : (state === "done" || state === "error") && shareUrl && shareUrl.includes("\n") ? (
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="hover:bg-[#e2e2e8] active:scale-[0.97] transition-all duration-75 disabled:opacity-50"
                      style={{ height: 34, paddingLeft: 14, paddingRight: 14, borderRadius: 16, fontSize: 13, fontWeight: 600, color: '#0a0a0a', backgroundColor: '#ffffff' }}
                    >
                      {copied ? "Copied All" : "Copy All Links"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75"
                      style={{ height: 34, paddingLeft: 14, paddingRight: 14, borderRadius: 16, fontSize: 13, fontWeight: 500, color: '#e3e3e3' }}
                    >
                      Add more
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Hidden file input for resume */}
      <input
        ref={resumeInputRef}
        type="file"
        className="hidden"
        onChange={handleResumeFileSelected}
      />

      {/* Resume / Abort Popup */}
      <AnimatePresence>
        {showResumePopup && interruptedSession && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
              onClick={() => setShowResumePopup(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed z-[201] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[420px] rounded-[20px]"
              style={{ backgroundColor: '#1f1f1f', boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 2px 6px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.22)', padding: 3 }}
            >
              <div className="p-6 rounded-[17px]" style={{ backgroundColor: '#111111' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MIcon name="cloud_upload" size={22} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-foreground">
                      Do you want to continue the previous upload where you left off?
                    </h3>
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                      The file is waiting to be completed or cancelled.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-secondary/50 px-4 py-3 mb-5">
                  <p className="text-[13px] text-muted-foreground font-medium truncate">
                    {interruptedSession.fileName}
                  </p>
                  <p className="text-[12px] text-muted-foreground/70 mt-1">
                    {(interruptedSession.fileSize / 1024 / 1024).toFixed(1)} MB · {interruptedSession.totalParts} chunks
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleAbortUpload}
                    className="flex-1 px-4 py-2.5 rounded-[16px] bg-[#1f1f1f] hover:bg-[#1a1a1a] text-[14px] font-semibold text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleResumeUpload}
                    className="flex-1 px-4 py-2.5 rounded-[16px] bg-white text-black text-[14px] font-semibold hover:bg-[#e2e2e8] transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
