"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { shouldUseMultipart } from "@/lib/storage/multipart"
import { useManage } from "@/hooks/useManage"
import { getTierLimits, FREE_LIMITS, getTierDelayMs, normalizeTier, isPaidTier } from "@/constants/tier-limits"
import { formatFileSize } from "./utils"
import type { UploadState, FileWithPreview, UploadZoneProps, InterruptedSession } from "./types"
import { STORAGE_KEY_INTERRUPTED_UPLOAD } from "@/constants"
import { MAX_EXPIRATION_MINUTES, NATIVE_UPLOAD_EVENT } from "@/constants/upload"
import { isTauri } from "@/lib/tauri"
import { apiFetch } from "@/lib/http/fetch"
import { validateSlug } from "@/lib/validation/slug"
import { formatUploadStats } from "./stats"
import { createZipArchive } from "./zip"
import { selectFiles, generateFileId } from "./file-select"
import { copyToClipboard, notifyDesktopUploadComplete } from "./desktop"
import { uploadSingle, uploadMultipart, initBatchUpload, uploadBatchSimple, uploadBatchMultipart } from "./transport"
import { runCdnUpload } from "./cdn-upload"
import { resumeMultipartUpload } from "./resume"
import { dispatchUploadLinks } from "@/lib/integrations/discordWebhook"
import { errorMessage as errMsg } from "@/lib/errors"

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
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [shareUrl, setShareUrl] = useState("")
  const [shareUrls, setShareUrls] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [burnOnRead, setBurnOnRead] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string>("")
  const [turnstileReady, setTurnstileReady] = useState(process.env.NODE_ENV === "development")
  const [csrfToken, setCsrfToken] = useState<string>("")
  const [zipProgress, setZipProgress] = useState(0)
  const [customFilename, setCustomFilename] = useState("")
  const [customSlug, setCustomSlug] = useState("")
  const [slugError, setSlugError] = useState<{ message: string; suggestions: string[] } | null>(null)
  // Custom expiration in minutes (Essential+). Defaults to the max (30 days) so
  // an untouched picker never shortens a paid user's default lifetime.
  const [expirationMinutes, setExpirationMinutes] = useState<number>(MAX_EXPIRATION_MINUTES)
  const [zippedFile, setZippedFile] = useState<File | null>(null)
  const [note, setNote] = useState("")
  const [zipMultipleFiles, setZipMultipleFiles] = useState(true)
  const [trayCollapsed, setTrayCollapsed] = useState(false)

  const turnstileRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resumeInputRef = useRef<HTMLInputElement>(null)
  const uploadStartTime = useRef<number>(0)
  const uploadedBytesRef = useRef<number>(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [interruptedSession, setInterruptedSession] = useState<InterruptedSession | null>(() => {
    if (typeof window === "undefined") return null
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INTERRUPTED_UPLOAD)
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [showResumePopup, setShowResumePopup] = useState(false)
  const [resuming, setResuming] = useState(false)

  const { user, stats, files: accountFiles, cdnAssets } = useManage()
  const tierLimits = user?.tier ? getTierLimits(user.tier) : FREE_LIMITS
  const uploadDelayMs = getTierDelayMs(normalizeTier(user?.tier))
  const MAX_SIZE = uploadType === "cdn" ? tierLimits.maxCdnFileSize : tierLimits.maxNormalUploadSize
  const MAX_FILES = uploadType === "cdn" ? tierLimits.maxCdnFilesPerUpload : tierLimits.maxFilesPerUpload
  const maxSizeLabel = formatFileSize(MAX_SIZE)

  // Account-wide link cap (the thing the server 403s on). Trim the selection to
  // the free slots the user actually has so we never let them pick more than
  // they can upload — MAX_FILES is only the per-upload ceiling.
  // Count from the server-authoritative `stats` (the exact numbers the 403 gate
  // checks: activeFiles / cdn totalAssets), falling back to the loaded arrays
  // only before stats arrive — the arrays can lag/empty and would skip the trim.
  const accountLinkCap = uploadType === "cdn" ? tierLimits.maxCdnLinks : tierLimits.maxFileLinks
  const accountLinksUsed = uploadType === "cdn"
    ? (stats?.cdnAssets ?? cdnAssets.length)
    : (stats?.activeFiles ?? accountFiles.length)
  const remainingSlots = Math.max(0, accountLinkCap - accountLinksUsed)
  const effectiveMaxFiles = Math.min(MAX_FILES, remainingSlots)

  const isMultiFile = files.length > 1 || files.some(f => f.path?.includes("/"))

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state === "uploading" || state === "encrypting") {
        e.preventDefault()
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
      localStorage.setItem(STORAGE_KEY_INTERRUPTED_UPLOAD, JSON.stringify(interruptedSession))
    } else {
      localStorage.removeItem(STORAGE_KEY_INTERRUPTED_UPLOAD)
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
        const response = await apiFetch("/api/v2/csrf")
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
    // Paid users see the CDN options first (a custom link for a single asset, or
    // a "not available" note for multi-file), so don't auto-start their CDN
    // uploads; free users keep the instant flow.
    const cdnShowsOptions = uploadType === "cdn" && isPaidTier(normalizeTier(user?.tier))
    if ((autoStart || uploadType === "cdn") && !cdnShowsOptions) {
      setAutoStartArmed(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFiles, autoStart, uploadType])

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return

      const noun = uploadType === "cdn" ? "CDN link" : "file"

      // No free slots left — surface it instead of letting the upload 403.
      if (effectiveMaxFiles === 0) {
        setErrorMessage(`You've reached your plan limit of ${accountLinkCap} ${noun}s. Delete some to free up space.`)
        setState("error")
        return
      }

      const sel = selectFiles(fileList, files, { maxFiles: effectiveMaxFiles, maxSize: MAX_SIZE, maxSizeLabel })

      if (sel.limitExceeded) {
        setErrorMessage(
          effectiveMaxFiles < MAX_FILES
            // Trimmed to the account's remaining free space (avoids a server 403).
            ? `You have room for ${remainingSlots} more ${noun}${remainingSlots !== 1 ? "s" : ""} — trimmed your selection to fit.`
            : `Maximum ${MAX_FILES} files allowed. Only the first ${MAX_FILES} files were selected.`
        )
      }
      if (sel.fileErrors.length > 0) {
        const e = sel.fileErrors
        setErrorMessage(e.slice(0, 3).join(". ") + (e.length > 3 ? ` and ${e.length - 3} more` : ""))
        setState("error")
        return
      }
      if (sel.totalSizeExceeded) {
        setErrorMessage(`Total size exceeds ${maxSizeLabel} limit (${formatFileSize(sel.totalSize)}). Remove some files.`)
        setState("error")
        return
      }
      if (sel.accepted.length > 0) {
        setFiles((prev) => [...prev, ...sel.accepted])
        setState("selected")
        setProgress(0)
        setCopied(false)
        if (!sel.limitExceeded) setErrorMessage("")
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files, MAX_FILES, MAX_SIZE, maxSizeLabel, effectiveMaxFiles, remainingSlots, accountLinkCap, uploadType]
  )

  // Multiple files init as ONE batch so a single solved Turnstile token verifies
  // the whole upload (instead of once per file, which hit the token reuse cap and
  // 403'd after ~50). Returns false when a partial failure was already surfaced,
  // so the caller skips the done state.
  const handleBatchUpload = async (
    currentCsrfToken: string,
    finalFilename: string | null,
    finalNote: string | null
  ): Promise<boolean> => {
    const meta = { burnOnRead, turnstileToken, expirationMinutes, folderId: currentFolderId }
    const initResults = await initBatchUpload(files, currentCsrfToken, meta, { finalFilename, finalNote })

    const urls: string[] = []
    const rawUrls: string[] = new Array(files.length).fill("")
    for (let i = 0; i < files.length; i++) {
      if (i > 0 && uploadDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, uploadDelayMs))
      }
      setUploadingIndex(i)
      setProgress(0)
      const f = files[i]
      const init = initResults[i]
      try {
        const url = init.kind === "multipart"
          ? await uploadBatchMultipart(f.file, init, setProgress, abortControllerRef.current?.signal)
          : await uploadBatchSimple(f.file, init, currentCsrfToken, { finalFilename, finalNote, burnOnRead }, setProgress)
        rawUrls[i] = url
        urls.push(files.length === 1 ? url : `${f.file.name}: ${url}`)
      } catch (err) {
        if (errMsg(err) === "Upload aborted") return false
        if (urls.length > 0) {
          setShareUrls(rawUrls)
          setShareUrl(urls.join("\n"))
          setErrorMessage(errMsg(err, "Upload partially failed."))
          setState("error")
          return false
        }
        throw err
      }
    }
    setShareUrls(rawUrls)
    setShareUrl(urls.join("\n"))
    return true
  }

  const handleUpload = async () => {
    if (files.length === 0 || isUploading) return
    setErrorMessage("")
    setSlugError(null)

    let finalFilename: string | null = customFilename.trim() || null
    let finalNote: string | null = note.trim() || null
    const finalSlug: string | null = customSlug.trim() || null

    const isMultipleOrNested = files.length > 1 || files.some(f => f.path?.includes("/"))
    const shouldZip = uploadType !== "cdn" && isMultipleOrNested && zipMultipleFiles
    // A custom link only applies when the upload produces a single share link:
    // a single file, a zipped archive, or a single CDN asset. For separate
    // multi-file uploads it doesn't apply, so we ignore any stale slug value.
    const slugApplies = uploadType === "cdn" ? files.length === 1 : (files.length === 1 || shouldZip)

    // Validate the custom link before doing any work — keeps the user in the
    // editable state (and avoids burning a single-use Turnstile token) on a
    // simple length/charset mistake, instead of bouncing to the error screen.
    if (finalSlug && slugApplies) {
      const slugCheck = validateSlug(finalSlug)
      if (!slugCheck.ok) {
        setSlugError({ message: slugCheck.error || "Invalid custom link", suggestions: [] })
        return
      }
    }

    let currentCsrfToken = csrfToken
    try {
      const csrfRes = await apiFetch("/api/v2/csrf")
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

    if (shouldZip) {
      if (finalFilename) {
        finalFilename = finalFilename.replace(/\.zip$/i, "") + ".zip"
      }
      setState("zipping")
      fileToUpload = await createZipArchive(files, finalFilename, setZipProgress)
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
    abortControllerRef.current = new AbortController()

    try {
      if (uploadType === "cdn") {
        const { text, urls } = await runCdnUpload(files, currentCsrfToken, {
          turnstileToken,
          folderId: currentFolderId,
          customSlug,
          uploadDelayMs,
          onFileIndex: setUploadingIndex,
          onProgress: setProgress,
          onUploadComplete,
        })
        setShareUrl(text)
        setShareUrls(urls)
      } else {
        const meta = { burnOnRead, turnstileToken, expirationMinutes, folderId: currentFolderId }
        if (shouldZip && fileToUpload) {
          const opts = { finalFilename, finalNote, finalSlug }
          const url = shouldUseMultipart(fileToUpload.size)
            ? await uploadMultipart(fileToUpload, currentCsrfToken, meta, opts, setProgress, setInterruptedSession, abortControllerRef.current?.signal)
            : await uploadSingle(fileToUpload, currentCsrfToken, meta, opts, setProgress)
          setShareUrl(url)
          setShareUrls([url])
        } else if (files.length === 1) {
          // Single file keeps the proven single-init path (supports custom slug).
          const f = files[0]
          const opts = { finalFilename, finalNote, filePath: f.path, finalSlug }
          const url = shouldUseMultipart(f.file.size)
            ? await uploadMultipart(f.file, currentCsrfToken, meta, opts, setProgress, setInterruptedSession, abortControllerRef.current?.signal)
            : await uploadSingle(f.file, currentCsrfToken, meta, opts, setProgress)
          setShareUrl(url)
          setShareUrls([url])
        } else {
          // Multiple files init as one Turnstile-verified batch.
          const completed = await handleBatchUpload(currentCsrfToken, finalFilename, finalNote)
          if (!completed) return
        }
      }
      setState("done")
      if (onUploadComplete && uploadType !== "cdn") {
        onUploadComplete(null)
      }
    } catch (error) {
      if (errMsg(error) === "Upload aborted") {
        return
      }
      const slugConflict = (error as { slugConflict?: { suggestions?: string[] } }).slugConflict
      if (slugConflict) {
        // The link was taken — drop back to the editable state so the user can
        // pick another. Turnstile tokens are single-use, so force a re-verify.
        setSlugError({ message: "That custom link is already taken. Try one of these:", suggestions: slugConflict.suggestions || [] })
        setState("selected")
        setTurnstileToken("")
        setTurnstileReady(process.env.NODE_ENV === "development")
        if (turnstileRef.current) turnstileRef.current.reset()
        return
      }
      setErrorMessage(errMsg(error, "Upload failed. Please try again."))
      setState("error")
    } finally {
      setIsUploading(false)
      abortControllerRef.current = null
    }
  }

  useEffect(() => {
    const handleNativeUpload = (e: Event) => {
      const customEvent = e as CustomEvent<{ filePath: string; name: string; size: number }>
      const { filePath, name, size } = customEvent.detail

      const dummyFile = new File([""], name, { type: "application/octet-stream" })
      Object.defineProperty(dummyFile, "size", { value: size })
      Object.defineProperty(dummyFile, "path", { value: filePath })

      setFiles([{ file: dummyFile, id: generateFileId(), path: filePath }])
      setState("selected")
      setAutoStartArmed(true)
    }

    window.addEventListener(NATIVE_UPLOAD_EVENT, handleNativeUpload)
    return () => window.removeEventListener(NATIVE_UPLOAD_EVENT, handleNativeUpload)
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
    if (state === "done" && shareUrl && isTauri()) {
      notifyDesktopUploadComplete(shareUrl)
        .then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 3000)
        })
        .catch((e) => console.error("[Desktop] Failed to trigger native notification/clipboard", e))
    }
  }, [state, shareUrl])

  // Notify the user's Discord webhook once per completed upload (keyless link;
  // no-op unless they've configured it in Integrations settings).
  const webhookSentRef = useRef(false)
  useEffect(() => {
    if (state !== "done") { webhookSentRef.current = false; return }
    if (webhookSentRef.current) return
    const links = shareUrls.length ? shareUrls : (shareUrl ? shareUrl.split("\n").filter(Boolean) : [])
    if (!links.length) return
    webhookSentRef.current = true
    dispatchUploadLinks(links)
  }, [state, shareUrl, shareUrls])

  const handleCopy = async () => {
    if (!shareUrl) return
    try {
      await copyToClipboard(shareUrl)
    } catch (e) {}
    setCopied(true)
    if (onUploadStateChange) onUploadStateChange("copied")
    setTimeout(() => setCopied(false), 2000)
  }

  // Copies a single file's link (multi-file uploads). Per-row "Copied" feedback
  // is tracked by index so only the clicked row lights up.
  const handleCopyOne = async (index: number) => {
    const link = shareUrls[index]
    if (!link) return
    try {
      await copyToClipboard(link)
    } catch (e) {}
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const doFullReset = () => {
    setState("idle")
    setFiles([])
    setProgress(0)
    setCopied(false)
    setCopiedIndex(null)
    setShareUrl("")
    setShareUrls([])
    setErrorMessage("")
    setIsUploading(false)
    setZipProgress(0)
    setZippedFile(null)
    setBurnOnRead(false)
    setTurnstileToken("")
    setTurnstileReady(process.env.NODE_ENV === "development")
    setCustomFilename("")
    setCustomSlug("")
    setSlugError(null)
    setExpirationMinutes(MAX_EXPIRATION_MINUTES)
    setNote("")
    setInterruptedSession(null)
    setShowResumePopup(false)
    setResuming(false)
    abortControllerRef.current?.abort()
    apiFetch("/api/v2/csrf")
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
      await apiFetch("/api/v2/upload-multipart/abort", {
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
    // Seed the tray with the resumed file so it renders the file row, the
    // progress bar, the live stats, and the copy-link button on completion.
    // Without this the tray is empty: no file, stuck on "Starting...", no link.
    setFiles([{ file, id: generateFileId(), path: file.name }])
    setZippedFile(null)
    setUploadingIndex(0)
    setState("uploading")
    setIsUploading(true)
    setProgress(0)
    setErrorMessage("")
    uploadStartTime.current = Date.now()

    try {
      await resumeMultipartUpload(file, interruptedSession, setProgress)
      setState("done")
      setShareUrl(interruptedSession.shareUrl)
      setShareUrls([interruptedSession.shareUrl])
      setInterruptedSession(null)
      setResuming(false)
      if (onUploadComplete && uploadType !== "cdn") onUploadComplete(null)
    } catch (err) {
      console.error("[Upload] Resume failed:", err)
      setErrorMessage(errMsg(err, "Resume failed"))
      setState("error")
      setIsUploading(false)
      setResuming(false)
    }
  }

  const getUploadStats = () =>
    formatUploadStats(files, uploadingIndex, progress, uploadStartTime.current)

  return {
    state,
    files,
    progress,
    copied,
    copiedIndex,
    shareUrl,
    shareUrls,
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
    customSlug,
    setCustomSlug,
    slugError,
    setSlugError,
    expirationMinutes,
    setExpirationMinutes,
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
    handleCopyOne,
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
