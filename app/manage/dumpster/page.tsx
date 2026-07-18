"use client"

import { useState } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { ShineButton } from "@/components/ui/shine-button"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { AlertMessage } from "@/components/ui/alert-message"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/http/fetch"
import { errorMessage } from "@/lib/errors"

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
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-6">
        <h1 className="text-[28px] font-medium tracking-tight text-[#171717] dark:text-[#e3e3e3] flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
          <span className="text-[#333] dark:text-[#ccc]">New Paste</span>
        </h1>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <SecondaryButton
            size="md"
            onClick={() => setContent("")}
            disabled={saving || !content}
            style={{ gap: 8 }}
          >
            <MIcon name="clear_all" size={17} className="shrink-0" />
            <span className="hidden sm:inline">Clear</span>
          </SecondaryButton>
          <ShineButton
            onClick={handleSave}
            disabled={saving || !content.trim()}
            size="md"
            style={{ gap: 8 }}
          >
            {saving ? (
              <LoadingSvg variant="white" size={16} className="shrink-0" />
            ) : (
              <MIcon name="save" size={15} className="shrink-0" />
            )}
            <span>Save Paste</span>
          </ShineButton>
        </div>
      </div>

      {error && (
        <AlertMessage tone="error" className="mb-6">
          {error}
        </AlertMessage>
      )}

      <div className="flex-1 bg-white dark:bg-[rgba(255,255,255,0.02)] rounded-[16px] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.06)] overflow-hidden flex flex-col">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type or paste your text here..."
          className="w-full h-full p-5 bg-transparent border-none focus:outline-none resize-none text-[14px] font-sans leading-relaxed text-[#171717] dark:text-[#f7f8f8] custom-scrollbar flex-1"
          spellCheck={false}
        />
      </div>
    </div>
  )
}
