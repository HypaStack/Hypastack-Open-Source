"use client"

import { useState } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/fetch"

export default function DumpsterPage() {
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSave = async () => {
    if (!content.trim()) return
    setSaving(true)
    setError("")

    try {
      const res = await apiFetch("/api/v2/bin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to save paste")
      }
      
      // Redirect to the public bin page
      router.push(`/bin/${data.id}`)
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-6">
        <div>
          <h1 className="text-[28px] font-medium tracking-tight text-[#171717] dark:text-[#e3e3e3] flex flex-wrap items-center gap-3">
            <span>New Paste</span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#007AFF]/10 text-[#007AFF] text-[12px] font-medium tracking-normal">
                <MIcon name="visibility_off" size={14} />
                Not linked to your account
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[12px] font-medium tracking-normal">
                <MIcon name="warning" size={14} />
                Stored in plain text, do not store sensitive data
              </span>
            </div>
          </h1>
          <p className="text-[13px] text-[#666] dark:text-[#888] mt-2">
            Anonymous text pastes. Destroyed after 180 days of inactivity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-4 sm:mt-0">
          <button
            type="button"
            onClick={() => setContent("")}
            disabled={saving || !content}
            className="inline-flex items-center gap-2 px-4 py-[11px] rounded-md bg-white dark:bg-[#222] text-[#171717] dark:text-[#e3e3e3] border border-[#e5e5e5] dark:border-transparent font-medium text-[15px] hover:bg-[#eaeaea] dark:hover:bg-[#2a2a2a] transition-colors leading-none disabled:opacity-50"
          >
            <MIcon name="clear_all" size={17} className="shrink-0" />
            <span className="hidden sm:inline">Clear</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="inline-flex items-center gap-2 px-5 py-[11px] rounded-md bg-[#171717] dark:bg-[#e3e3e3] text-white dark:text-[#111] font-medium text-[15px] hover:bg-[#333] dark:hover:bg-[#ccc] transition-colors leading-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="w-[15px] h-[15px] border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin shrink-0" />
            ) : (
              <MIcon name="save" size={15} className="shrink-0" />
            )}
            <span>Save Paste</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-md bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[14px] font-medium flex items-center gap-2 border border-red-100 dark:border-red-500/20">
          <MIcon name="error" size={18} />
          {error}
        </div>
      )}

      <div className="flex-1 bg-white dark:bg-[#111] rounded-md border border-black/5 dark:border-white/5 overflow-hidden flex flex-col">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type or paste your text here..."
          className="w-full h-full p-3 bg-transparent border-none focus:outline-none resize-none text-[14px] font-sans leading-relaxed text-[#171717] dark:text-[#e3e3e3] custom-scrollbar flex-1"
          spellCheck={false}
        />
      </div>
    </div>
  )
}
