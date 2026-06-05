"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import JSZip from "jszip"
import { shouldUseMultipart, generateEncryptionKey, uploadFileMultipart, DEFAULT_CHUNK_SIZE } from "@/lib/multipart"
import { useAuth } from "@/hooks/useAuth"
import { getTierLimits, FREE_LIMITS, getTierDelayMs, normalizeTier } from "@/lib/tier-limits"
import { formatFileSize, uploadWithXHR } from "./utils"
import type { UploadState, FileWithPreview, UploadZoneProps, InterruptedSession } from "./types"

const STORAGE_KEY = "hypa_interrupted_upload"

export function useUpload({
  initialFiles,
  autoStart = true,
  uploadType = "files",
  onUploadComplete,
  onUploadStateChange,
  currentFolderId = null,
}: UploadZoneProps) {
  const [state, setState] = useState<UploadState>("idle")
  const [autoStartArmed, setAutoStartArmed] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState(0)
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [progress, setProgress] = useState(0)
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [pinEnabled] = useState(false)
  const [pin] = useState("")
  const [burnOnRead, setBurnOnRead] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string>("")
  const [turnstileReady, setTurnstileReady] = useState(process.env.NODE_ENV === "development")
  const [csrfToken, setCsrfToken] = useState<string>("")
  const [zipProgress, setZipProgress] = useState(0)
  const [customFilename, setCustomFilename] = useState("")
  const [zippedFile, setZippedFile] = useState<File | null>(null)
  const [note, setNote] = useState("")
  const [zipMultipleFiles, setZipMultipleFiles] = useState(true)
  const [trayCollapsed, setTrayCollapsed] = useState(false)

  const turnstileRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resumeInputRef = useRef<HTMLInputElement>(null)
  const uploadStartTime = useRef<number>(0)
  const uploadedBytesRef = useRef<number>(0)

  const [interruptedSession, setInterruptedSession] = useState<InterruptedSession | null>(() => {
    if (typeof window === "undefined") return null
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [showResumePopup, setShowResumePopup] = useState(false)
  const [resuming, setResuming] = useState(false)

  const { user } = useAuth()
  const tierLimits = user?.tier ? getTierLimits(user.tier) : FREE_LIMITS
  const uploadDelayMs = getTierDelayMs(normalizeTier(user?.tier))
  const MAX_SIZE = uploadType === "cdn" ? tierLimits.maxCdnFileSize : tierLimits.maxNormalUploadSize
  const MAX_FILES = uploadType === "cdn" ? tierLimits.maxCdnFilesPerUpload : tierLimits.maxFilesPerUpload
  const maxSizeLabel = formatFileSize(MAX_SIZE)

  const isMultiFile = files.length > 1 || files.some(f => f.path?.includes("/"))

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state === "uploading" || state === "encrypting") {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [state])

  useEffect(() => {
    if (onUploadStateChange) onUploadStateChange(state)
  }, [state, onUploadStateChange])

  useEffect(() => {
    if (interruptedSession) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(interruptedSession))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [interruptedSession])

  useEffect(() => {
    if (interruptedSession && state === "idle") {
      setShowResumePopup(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    async function fetchCsrfToken() {
      try {
        const response = await fetch("/api/v2/csrf")
        const data = await response.json()
        if (data.token) setCsrfToken(data.token)
      } catch (err) {
        console.error("Failed to fetch CSRF token:", err)
      }
    }
    fetchCsrfToken()
  }, [])

  const initialFilesProcessed = useRef(false)
  useEffect(() => {
    if (!initialFiles) return
    if (initialFilesProcessed.current) return
    initialFilesProcessed.current = true
    const list =
      initialFiles instanceof FileList
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

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return
      const newFiles: FileWithPreview[] = []
      const errors: string[] = []
      let limitExceeded = false

      Array.from(fileList).forEach((f) => {
        if (files.length + newFiles.length >= MAX_FILES) {
          limitExceeded = true
          return
        }
        const error = validateFile(f)
        if (error) errors.push(error)
        else newFiles.push({ file: f, id: generateId(), path: f.name })
      })

      if (limitExceeded) {
        setErrorMessage(`Maximum ${MAX_FILES} files allowed. Only the first ${MAX_FILES} files were selected.`)
      }

      if (errors.length > 0) {
        setErrorMessage(errors.slice(0, 3).join(". ") + (errors.length > 3 ? ` and ${errors.length - 3} more` : ""))
        setState("error")
        return
      }

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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files, MAX_FILES, MAX_SIZE, maxSizeLabel]
  )

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

    const xhr = await uploadWithXHR("/api/v2/upload-proxy", "POST", formData, (pct) => {
      onProgress(Math.min(90, pct))
    })

    const response = JSON.parse(xhr.responseText)
    if (!response.success) {
      throw new Error(response.error || "Proxy upload failed")
    }
    return response.shareUrl
  }

  const handleSingleUpload = async (
    fileToUpload: File,
    currentCsrfToken: string,
    finalFilename: string | null,
    finalNote: string | null,
    filePath?: string
  ): Promise<string> => {
    const { key: encKey, keyBase64 } = await generateEncryptionKey()

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

      return `${url}#key=${keyBase64}`
    } catch (fetchError: any) {
      const isCORSError = fetchError.message === "Failed to fetch" || fetchError.name === "TypeError"
      if (isCORSError) {
        setProgress(0)
        const proxyUrl = await uploadViaProxy(
          encryptedBlob,
          finalNote,
          finalFilename,
          fileId,
          proxyToken,
          currentCsrfToken,
          (pct) => setProgress(pct)
        )
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
    const { key: encKey, keyBase64 } = await generateEncryptionKey()

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

    const sessionInfo: InterruptedSession = {
      fileId,
      uploadId,
      r2Key: "",
      totalParts,
      chunkSize: DEFAULT_CHUNK_SIZE,
      fileName: fileToUpload.name,
      fileSize: fileToUpload.size,
      keyBase64,
      shareUrl: `${url}#key=${keyBase64}`,
    }
    setInterruptedSession(sessionInfo)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionInfo))

    try {
      let etags: any[]

      const tauriInternals = (window as any).__TAURI_INTERNALS__
      const nativeFilePath = (fileToUpload as any).path as string | undefined

      if (tauriInternals && nativeFilePath) {
        const { invoke } = await import("@tauri-apps/api/core")
        const { listen } = await import("@tauri-apps/api/event")

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
            filePath: nativeFilePath,
            presignedUrls,
            keyBase64,
            chunkSize: DEFAULT_CHUNK_SIZE,
          })
        } finally {
          unlisten()
        }
      } else {
        const result = await uploadFileMultipart({
          file: fileToUpload,
          encryptionKey: encKey,
          presignedUrls,
          chunkSize: DEFAULT_CHUNK_SIZE,
          onProgress: (pct) => setProgress(Math.min(95, pct)),
        })
        etags = result.etags
      }

      const completeResponse = await fetch("/api/v2/upload-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, uploadId, parts: etags }),
      })

      if (!completeResponse.ok) {
        const error = await completeResponse.json()
        throw new Error(error.error || "Multipart upload finalization failed")
      }

      setProgress(100)
      setInterruptedSession(null)
      return `${url}#key=${keyBase64}`
    } catch (uploadError: any) {
      console.error("[Upload] Multipart upload interrupted:", uploadError.message)
      throw uploadError
    }
  }

  const handleCdnUpload = async (currentCsrfToken: string) => {
    const totalBytes = files.reduce((acc, f) => acc + f.file.size, 0)
    let uploadedBytes = 0

    const filesMeta = files.map(f => ({
      file: f.file,
      fileName: f.file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_"),
      contentType: f.file.type || "application/octet-stream",
    }))

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

  const handleUpload = async () => {
    if (files.length === 0 || isUploading) return
    setErrorMessage("")

    let finalFilename: string | null = customFilename.trim() || null
    let finalNote: string | null = note.trim() || null

    let currentCsrfToken = csrfToken
    try {
      const csrfRes = await fetch("/api/v2/csrf")
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
          const urls: string[] = []
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

  useEffect(() => {
    const handleNativeUpload = (e: Event) => {
      const customEvent = e as CustomEvent<{ filePath: string; name: string; size: number }>
      const { filePath, name, size } = customEvent.detail

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

  useEffect(() => {
    if (!autoStartArmed) return
    if (state !== "selected" || isUploading) return
    if (!csrfToken) return
    if (process.env.NODE_ENV !== "development" && !turnstileToken) return
    setAutoStartArmed(false)
    handleUpload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartArmed, state, isUploading, csrfToken, turnstileToken])

  useEffect(() => {
    if (state === "done" && shareUrl && (window as any).__TAURI_INTERNALS__) {
      ;(async () => {
        try {
          const { sendNotification } = await import("@tauri-apps/plugin-notification")
          const { writeText } = await import("@tauri-apps/plugin-clipboard-manager")
          await writeText(shareUrl)
          sendNotification({
            title: "Hypastack Upload Complete",
            body: "Your file has been uploaded. The link is copied to your clipboard.",
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
        const { writeText } = await import("@tauri-apps/plugin-clipboard-manager")
        await writeText(shareUrl)
      } else {
        await navigator.clipboard.writeText(shareUrl)
      }
    } catch (e) {}
    setCopied(true)
    if (onUploadStateChange) onUploadStateChange("copied")
    setTimeout(() => setCopied(false), 2000)
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
    setBurnOnRead(false)
    setTurnstileToken("")
    setTurnstileReady(process.env.NODE_ENV === "development")
    setCustomFilename("")
    setNote("")
    setInterruptedSession(null)
    setShowResumePopup(false)
    setResuming(false)
    fetch("/api/v2/csrf")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.token || ""))
    if (turnstileRef.current) turnstileRef.current.reset()
    if (inputRef.current) inputRef.current.value = ""
    initialFilesProcessed.current = false
  }

  const handleReset = () => {
    if (interruptedSession) {
      setShowResumePopup(true)
      return
    }
    doFullReset()
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
    resumeInputRef.current?.click()
  }

  const handleResumeFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !interruptedSession) return

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

      const { importKeyFromBase64, readFileSlice, encryptChunk, uploadChunkToR2 } =
        await import("@/lib/multipart")
      const encKey = await importKeyFromBase64(interruptedSession.keyBase64)

      const chunkSize = interruptedSession.chunkSize

      const allEtags: { partNumber: number; etag: string }[] = [...uploadedParts]

      const baseProgress = (uploadedParts.length / interruptedSession.totalParts) * 100
      setProgress(baseProgress)

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
          const etag = await uploadChunkToR2(presignedUrl, encrypted, (loaded, total) => {
            chunkProgress[idx] = (loaded / total) * chunkBytes
            reportProgress()
          })

          allEtags.push({ partNumber, etag })
          chunkProgress[idx] = chunkBytes
          reportProgress()
        }
      }

      const workerCount = Math.min(MAX_CONCURRENT, missingParts.length)
      const workers: Promise<void>[] = []
      for (let i = 0; i < workerCount; i++) workers.push(worker())
      await Promise.all(workers)

      allEtags.sort((a, b) => a.partNumber - b.partNumber)

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
    const bytesUploaded = uploadedPastFilesBytes + currentFileBytes * (progress / 100)

    const elapsed = (Date.now() - uploadStartTime.current) / 1000
    if (elapsed < 1 || bytesUploaded === 0) return "Starting..."

    const speed = bytesUploaded / elapsed
    const remaining = totalBytes - bytesUploaded
    const etaSeconds = Math.ceil(remaining / speed)
    const speedStr =
      speed >= 1024 * 1024
        ? `${(speed / (1024 * 1024)).toFixed(1)} MB/s`
        : `${(speed / 1024).toFixed(0)} KB/s`

    const progressStr = `${formatFileSize(bytesUploaded)} / ${formatFileSize(totalBytes)}`

    if (etaSeconds < 5) return `${progressStr} • ${speedStr} • Almost done`
    if (etaSeconds < 60) return `${progressStr} • ${speedStr} • ${etaSeconds}s left`
    const mins = Math.floor(etaSeconds / 60)
    const secs = etaSeconds % 60
    return `${progressStr} • ${speedStr} • ${mins}m ${secs}s left`
  }

  return {
    state,
    files,
    progress,
    copied,
    shareUrl,
    errorMessage,
    isUploading,
    burnOnRead,
    setBurnOnRead,
    turnstileToken,
    setTurnstileToken,
    turnstileReady,
    setTurnstileReady,
    zipProgress,
    customFilename,
    setCustomFilename,
    zippedFile,
    note,
    setNote,
    zipMultipleFiles,
    setZipMultipleFiles,
    trayCollapsed,
    setTrayCollapsed,
    uploadingIndex,
    isMultiFile,
    interruptedSession,
    showResumePopup,
    setShowResumePopup,
    resuming,
    turnstileRef,
    inputRef,
    resumeInputRef,
    handleUpload,
    handleCopy,
    handleReset,
    handleAbortUpload,
    handleResumeUpload,
    handleResumeFileSelected,
    handleFiles,
    getUploadStats,
    user,
    uploadType,
  }
}

export type UseUploadReturn = ReturnType<typeof useUpload>
