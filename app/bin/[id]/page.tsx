"use client"

import { useEffect, useState, use } from "react"
import { MIcon } from "@/components/ui/material-icon"
import Link from "next/link"
import { motion } from "motion/react"
import { apiFetch } from "@/lib/fetch"

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
    window.open(`/api/v2/bin/${id}/raw`, '_blank', 'noopener,noreferrer')
  }

  // Calculate days left for 180-day retention
  const retentionDays = createdAt ? 180 - Math.floor((Date.now() - new Date(createdAt).getTime()) / 864e5) : 180

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans bg-white">
      <div className="relative w-full max-w-[440px]">
        <div className="flex justify-center mb-8">
          <Link href="/" className="hover:opacity-80 transition-opacity active:scale-[0.97]">
            <img 
              src="https://r2.hypastack.com/cdn/zvo7jefzshuu/logo-main.webp" 
              className="select-none h-14 w-14 rounded-md" 
              alt="Hypastack" 
              draggable={false} 
            />
          </Link>
        </div>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24">
            <svg className="animate-spin h-8 w-8 text-[#ccc]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </motion.div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: 6, padding: 24, border: '1px solid #e5e5e5', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center gap-3 mb-3">
                <MIcon name="error" className="text-red-500" size={28} />
                <h2 className="text-[20px] font-semibold text-[#111] tracking-tight">
                  Paste not found
                </h2>
              </div>
              <p className="text-[13px] text-[#888] mb-6 leading-relaxed">
                {error || "The paste you're looking for doesn't exist or has expired."}
              </p>
              <div className="flex gap-2">
                <Link
                  href="/manage/dumpster"
                  className="hover:bg-[#111] active:scale-[0.97] transition-all duration-75 flex items-center justify-center"
                  style={{ height: 38, paddingLeft: 16, paddingRight: 16, borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#ffffff', backgroundColor: '#030303' }}
                >New Paste</Link>
                <Link
                  href="/"
                  className="hover:bg-[#f0f0f0] active:scale-[0.97] transition-all duration-75 flex items-center justify-center"
                  style={{ height: 38, paddingLeft: 16, paddingRight: 16, borderRadius: 6, fontSize: 13, fontWeight: 500, color: '#333', backgroundColor: '#f5f5f5', border: '1px solid #e5e5e5' }}
                >Home</Link>
              </div>
            </div>
          </motion.div>
        )}

        {content !== null && !error && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: 6, overflow: 'hidden', border: '1px solid #e5e5e5', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
              <div style={{ padding: '20px 20px 16px' }}>
                <h1 className="text-[18px] font-semibold tracking-tight break-all leading-snug mb-2 text-[#111]">
                  {id}.txt
                </h1>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#888', backgroundColor: '#f0f0f0', border: '1px solid #e5e5e5', padding: '2px 6px', borderRadius: 5 }}>TXT</span>
                  <span style={{ fontSize: 13, color: '#888' }}>
                    {fmtBytes(new Blob([content]).size)}
                  </span>
                </div>
              </div>

              <div style={{ margin: '0 12px 12px', borderRadius: 6, backgroundColor: '#f9f9f9', border: '1px solid #ebebeb', padding: 4 }}>
                <div
                  className="flex items-center justify-between hover:bg-[#f0f0f0] transition-all duration-75"
                  style={{ height: 38, paddingLeft: 12, paddingRight: 12, borderRadius: 6 }}
                >
                  <span className="flex items-center gap-2.5" style={{ fontSize: 13, color: '#888' }}>
                    <MIcon name="schedule" size={14} style={{ color: '#bbb' }} />Retention
                  </span>
                  <span className="text-[13px] font-medium text-[#333]">~{Math.max(0, retentionDays)} days</span>
                </div>
                <div style={{ height: 1, margin: '0 8px', backgroundColor: '#ebebeb' }} />
                <div
                  className="flex items-center justify-between hover:bg-[#f0f0f0] transition-all duration-75"
                  style={{ height: 38, paddingLeft: 12, paddingRight: 12, borderRadius: 6 }}
                >
                  <span className="flex items-center gap-2.5" style={{ fontSize: 13, color: '#888' }}>
                    <MIcon name="visibility_off" size={14} style={{ color: '#bbb' }} />Privacy
                  </span>
                  <span className="text-[13px] font-medium text-[#333]">Anonymous</span>
                </div>
              </div>

              <div style={{ padding: '0 12px 12px' }}>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="flex-1 flex items-center justify-center gap-2 hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75"
                    style={{ height: 42, borderRadius: 6, fontSize: 14, fontWeight: 600, color: '#fff', backgroundColor: '#030303' }}
                  >
                    <MIcon name={copied ? "check" : "content_copy"} size={16} />
                    {copied ? "Copied" : "Copy to Clipboard"}
                  </button>
                  <button
                    onClick={handleRaw}
                    className="flex items-center justify-center hover:bg-[#e0e0e0] active:scale-[0.97] transition-all duration-75"
                    style={{ width: 42, height: 42, borderRadius: 6, backgroundColor: '#f0f0f0', border: '1px solid #e5e5e5', color: '#111' }}
                    title="View Raw"
                  >
                    <MIcon name="code" size={18} />
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </div>
    </main>
  )
}
