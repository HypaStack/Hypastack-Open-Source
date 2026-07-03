"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { MIcon } from "@/components/ui/material-icon"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { useAuth } from "@/hooks/useAuth"
import { apiFetch } from "@/lib/http/fetch"
import { hypaConfirm } from "@/components/ui/hypa-notif"

interface PendingFile {
  file: File
  status: "pending" | "uploading" | "done" | "error"
  progress: number
  error?: string
  fileId?: string
  publicUrl?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export default function ForumNewPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, userId } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [warningDismissed, setWarningDismissed] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [files, setFiles] = useState<PendingFile[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auth gate
  if (!isLoading && !isAuthenticated) {
    router.push("/signin?redirect=/forum/new")
    return null
  }

  const handleAddFiles = (newFiles: FileList | null) => {
    if (!newFiles) return
    const remaining = 5 - files.length
    if (remaining <= 0) {
      setError("Maximum 5 files per post")
      return
    }

    const toAdd = Array.from(newFiles).slice(0, remaining)

    // Check for duplicate names
    for (const f of toAdd) {
      if (files.some(existing => existing.file.name === f.name)) {
        setError(`"${f.name}" is already added. Rename the file if you want to upload it again.`)
        return
      }
    }

    setFiles(prev => [...prev, ...toAdd.map(file => ({ file, status: "pending" as const, progress: 0 }))])
    setError(null)
  }

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      const tag = tagInput.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30)
      if (tag && !tags.includes(tag) && tags.length < 10) {
        setTags(prev => [...prev, tag])
      }
      setTagInput("")
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      // 1. Create the post
      const csrfRes = await apiFetch("/api/v2/csrf")
      const { token: csrfToken } = await csrfRes.json()

      const postRes = await apiFetch("/api/v2/forum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csrfToken, title: title.trim(), description: description.trim() || undefined, tags }),
      })

      if (!postRes.ok) {
        const data = await postRes.json()
        throw new Error(data.error || "Failed to create post")
      }

      const { postId, slug } = await postRes.json()

      // 2. Upload files one by one
      for (let i = 0; i < files.length; i++) {
        const pf = files[i]
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: "uploading" } : f))

        try {
          // Get fresh CSRF token for each file
          const csrfRes2 = await apiFetch("/api/v2/csrf")
          const { token: csrfToken2 } = await csrfRes2.json()

          // upload-init
          const initRes = await apiFetch(`/api/v2/forum/${postId}/files`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              csrfToken: csrfToken2,
              fileName: pf.file.name,
              fileSize: pf.file.size,
              contentType: pf.file.type || "application/octet-stream",
            }),
          })

          if (!initRes.ok) {
            const data = await initRes.json()
            throw new Error(data.error || "Upload init failed")
          }

          const { fileId, uploadUrl, sanitizedName } = await initRes.json()

          // Upload to R2 via presigned URL
          const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            body: pf.file,
            headers: {
              "Content-Type": pf.file.type || "application/octet-stream",
            },
          })

          if (!uploadRes.ok) {
            throw new Error("Failed to upload file to storage")
          }

          setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, progress: 80 } : f))

          // upload-complete
          const completeRes = await apiFetch(`/api/v2/forum/${postId}/files`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId, sanitizedName, contentType: pf.file.type, csrfToken: csrfToken2 }),
          })

          if (!completeRes.ok) {
            const data = await completeRes.json()
            throw new Error(data.error || "Upload complete failed")
          }

          const { publicUrl } = await completeRes.json()
          setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: "done", progress: 100, fileId, publicUrl } : f))
        } catch (err: any) {
          setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: "error", error: err.message } : f))
        }
      }

      // 3. Navigate to the new post
      router.push(`/forum/${slug}`)
    } catch (err: any) {
      setError(err.message || "Something went wrong")
      setSubmitting(false)
    }
  }

  // Warning screen
  if (!warningDismissed) {
    return (
      <main className="flex min-h-screen flex-col bg-[#08090a] ">
        <Navbar />
        <section className="flex-1 pt-24 pb-20 flex items-center justify-center">
          <div className="max-w-[480px] mx-auto px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#FFF3E0]  flex items-center justify-center mx-auto mb-5">
              <MIcon name="warning" size={28} className="text-[#F57C00]" />
            </div>
            <h2 className="text-[20px] font-bold text-[#f7f8f8]  mb-3">
              Public upload notice
            </h2>
            <p className="text-[14px] text-[#a1a1aa]  leading-relaxed mb-6">
              Files uploaded to the forum are <strong className="text-[#f7f8f8] ">not encrypted</strong> and will be <strong className="text-[#f7f8f8] ">publicly visible and freely downloadable</strong> by anyone. Do not upload private, sensitive, or confidential files here.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/forum"
                className="h-10 px-5 rounded-full flex items-center justify-center text-[13px] font-medium text-[#a1a1aa]  bg-[rgba(255,255,255,0.04)]  hover:bg-[rgba(255,255,255,0.08)]  transition-colors"
              >
                Go back
              </Link>
              <button
                onClick={() => setWarningDismissed(true)}
                className="h-10 px-5 rounded-full flex items-center justify-center text-[13px] font-semibold text-[#08090a] bg-[#f7f8f8]   hover:bg-[#e3e3e3]  active:scale-[0.97] transition-all duration-75"
              >
                I understand, continue
              </button>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#08090a] ">
      <Navbar />

      <section className="flex-1 pt-24 pb-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <Link
            href="/forum"
            className="inline-flex items-center gap-1.5 text-[13px] text-[#898e97] hover:text-[#444]  transition-colors mb-6"
          >
            <MIcon name="arrow_back" size={14} />
            Back to forum
          </Link>

          <h1 className="text-[24px] font-bold text-[#f7f8f8]  tracking-tight mb-6">
            New post
          </h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-[12px] font-medium text-[#444]  mb-1.5">
                Title <span className="text-[#ef4444]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. 5 files you need for your project"
                maxLength={200}
                required
                className="w-full h-10 px-4 rounded-xl bg-[#08090a]  border border-[rgba(255,255,255,0.08)]  text-[13px] text-[#f7f8f8]  placeholder:text-[#555]  focus:outline-none focus:border-[#898e97]  transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[12px] font-medium text-[#444]  mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what you're sharing..."
                rows={4}
                maxLength={5000}
                className="w-full px-4 py-3 rounded-xl bg-[#08090a]  border border-[rgba(255,255,255,0.08)]  text-[13px] text-[#f7f8f8]  placeholder:text-[#555]  focus:outline-none focus:border-[#898e97]  transition-colors resize-none"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-[12px] font-medium text-[#444]  mb-1.5">
                Tags (press Enter to add, max 10)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#444]  bg-[rgba(255,255,255,0.04)]  px-2.5 py-1 rounded-full"
                  >
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-[#ef4444] transition-colors">
                      <MIcon name="close" size={10} />
                    </button>
                  </span>
                ))}
              </div>
              {tags.length < 10 && (
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Add a tag..."
                  className="w-full h-9 px-4 rounded-xl bg-[#08090a]  border border-[rgba(255,255,255,0.08)]  text-[12px] text-[#f7f8f8]  placeholder:text-[#555]  focus:outline-none focus:border-[#898e97]  transition-colors"
                />
              )}
            </div>

            {/* Files */}
            <div>
              <label className="block text-[12px] font-medium text-[#444]  mb-1.5">
                Files (max 5)
              </label>

              {/* Drop zone */}
              {files.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 rounded-xl border-2 border-dashed border-[rgba(255,255,255,0.12)]  hover:border-[rgba(255,255,255,0.15)]  bg-[#08090a]  transition-colors flex flex-col items-center justify-center gap-2"
                >
                  <MIcon name="cloud_upload" size={28} className="text-[#444] " />
                  <span className="text-[13px] text-[#898e97] ">
                    Click to select files
                  </span>
                  <span className="text-[11px] text-[#555] ">
                    {5 - files.length} slot{5 - files.length !== 1 ? "s" : ""} remaining
                  </span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => handleAddFiles(e.target.files)}
              />

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2 mt-3">
                  {files.map((pf, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 bg-[#08090a]  rounded-lg border border-[rgba(255,255,255,0.08)]  p-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.04)]  flex items-center justify-center flex-shrink-0">
                        <MIcon
                          name={
                            pf.status === "done" ? "check_circle" :
                            pf.status === "error" ? "error" :
                            pf.status === "uploading" ? "sync" :
                            "description"
                          }
                          size={14}
                          className={
                            pf.status === "done" ? "text-green-500" :
                            pf.status === "error" ? "text-red-500" :
                            pf.status === "uploading" ? "text-blue-500 animate-spin" :
                            "text-[#999]"
                          }
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[#e3e3e3]  truncate">{pf.file.name}</p>
                        <p className="text-[11px] text-[#999]">
                          {formatFileSize(pf.file.size)}
                          {pf.error && <span className="text-red-500 ml-2">{pf.error}</span>}
                        </p>
                      </div>
                      {pf.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(i)}
                          className="text-[#898e97] hover:text-[#ef4444] transition-colors flex-shrink-0"
                        >
                          <MIcon name="close" size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 text-[13px] text-[#ff6b6b] bg-[rgba(255,107,107,0.08)] border border-[rgba(255,107,107,0.2)] p-3 rounded-[8px]">
                <MIcon name="error" size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={!title.trim() || files.length === 0 || submitting}
                className="h-10 px-6 rounded-full bg-[#f7f8f8]  text-[#08090a]  text-[13px] font-semibold disabled:opacity-40 hover:bg-[#e3e3e3]  active:scale-[0.97] transition-all duration-75 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <LoadingSvg variant="dark" size={15} />
                    Publishing...
                  </>
                ) : (
                  <>
                    <MIcon name="send" size={14} />
                    Publish
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}
