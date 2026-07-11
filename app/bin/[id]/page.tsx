"use client"

import { useEffect, useState, use } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { ShineButton } from "@/components/ui/shine-button"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { ShineCard } from "@/components/ui/shine-card"
import { LoadingSvg } from "@/components/ui/loading-svg"
import Link from "next/link"
import { motion } from "motion/react"
import { apiFetch } from "@/lib/http/fetch"
import { API_BASE } from "@/constants"

function fmtBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024, s = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + s[i]
}

function daysLeft(d: string): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 864e5)
}

export default function BinViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [content, setContent] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    apiFetch(`/api/v2/bin/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setContent(data.content)
        setCreatedAt(data.createdAt)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const copyToClipboard = () => {
    if (!content) return
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRaw = () => {
    window.open(`${API_BASE}/bin/${id}/raw`, '_blank', 'noopener,noreferrer')
  }

  // Calculate days left for 180-day retention
  const retentionDays = createdAt ? 180 - Math.floor((Date.now() - new Date(createdAt).getTime()) / 864e5) : 180

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans bg-[#08090a]">
      <div className="relative w-full max-w-[440px]">
        <div className="flex justify-center mb-8">
          <Link href="/" className="hover:opacity-80 transition-opacity active:scale-[0.97]">
            <img 
              src="https://r2.hypastack.com/cdn/lvko6iovrtq7/footer.webp" 
              className="select-none h-14 w-14 rounded-md object-contain" 
              alt="Hypastack" 
              draggable={false} 
            />
          </Link>
        </div>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24">
            <LoadingSvg variant="white" size={32} />
          </motion.div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <ShineCard radius={16} className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <MIcon name="error" className="text-red-500" size={28} />
                <h2 className="text-[20px] font-semibold text-[#f7f8f8] tracking-tight">
                  Paste not found
                </h2>
              </div>
              <p className="text-[13px] text-[#898e97] mb-6 leading-relaxed">
                {error || "The paste you're looking for doesn't exist or has expired."}
              </p>
              <div className="flex gap-2">
                <ShineButton
                  href="/manage/dumpster"
                  as={Link}
                  className="flex-1"
                >New Paste</ShineButton>
                <SecondaryButton
                  href="/"
                  as={Link}
                  size="lg"
                  className="flex-1"
                >Home</SecondaryButton>
              </div>
            </ShineCard>
          </motion.div>
        )}

        {content !== null && !error && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <ShineCard radius={16} tilt={0}>
              <div className="p-5 pb-4">
                <h1 className="text-[18px] font-semibold tracking-tight break-all leading-snug mb-2 text-[#f7f8f8]">
                  {id}.txt
                </h1>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-[#898e97] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] px-1.5 py-0.5 rounded-[5px]">TXT</span>
                  <span className="text-[13px] text-[#898e97]">
                    {fmtBytes(new Blob([content]).size)}
                  </span>
                </div>
              </div>

              <div className="mx-3 mb-3 rounded-[6px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] p-1">
                <div
                  className="flex items-center justify-between hover:bg-[rgba(255,255,255,0.04)] transition-all duration-150 h-[38px] px-3 rounded-[6px]"
                >
                  <span className="flex items-center gap-2.5 text-[13px] text-[#898e97]">
                    <MIcon name="schedule" size={14} className="opacity-70" />Retention
                  </span>
                  <span className="text-[13px] font-medium text-[#f7f8f8]">~{Math.max(0, retentionDays)} days</span>
                </div>
                <div className="h-[1px] mx-2 bg-[rgba(255,255,255,0.04)]" />
                <div
                  className="flex items-center justify-between hover:bg-[rgba(255,255,255,0.04)] transition-all duration-150 h-[38px] px-3 rounded-[6px]"
                >
                  <span className="flex items-center gap-2.5 text-[13px] text-[#898e97]">
                    <MIcon name="visibility_off" size={14} className="opacity-70" />Privacy
                  </span>
                  <span className="text-[13px] font-medium text-[#f7f8f8]">Anonymous</span>
                </div>
              </div>

              <div className="px-3 pb-3">
                <div className="flex gap-2">
                  <ShineButton
                    onClick={copyToClipboard}
                    className="flex-1"
                    style={{ gap: 8 }}
                  >
                    <MIcon name={copied ? "check" : "content_copy"} size={16} />
                    {copied ? "Copied" : "Copy to Clipboard"}
                  </ShineButton>
                  <SecondaryButton
                    onClick={handleRaw}
                    size="lg"
                    iconOnly
                    title="View Raw"
                    aria-label="View Raw"
                  >
                    <MIcon name="code" size={18} />
                  </SecondaryButton>
                </div>
              </div>

            </ShineCard>
          </motion.div>
        )}
      </div>
    </main>
  )
}
