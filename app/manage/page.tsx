"use client"

import { useAuth } from "@/hooks/useAuth"
import Link from "next/link"
import { motion } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { useMemo, useState } from "react"

const GREETINGS = [
  (n: string) => `What's the move, ${n}?`,
  (n: string) => `Welcome back, ${n}.`,
  (n: string) => `Hey ${n}, let's go.`,
  (n: string) => `${n}. Ready when you are.`,
  (n: string) => `Good to see you, ${n}.`,
  (n: string) => `Let's build something, ${n}.`,
  (n: string) => `Back again, ${n}?`,
]

function formatStorage(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B"
  const k = 1024
  const s = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), s.length - 1)
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + s[i]
}

function getFileExt(name: string) {
  return name.split(".").pop()?.toUpperCase().substring(0, 4) || "FILE"
}

const TIPS = [
  { icon: "lock", text: "Your files are encrypted client-side before leaving your device." },
  { icon: "link", text: "Share links include the decryption key in the fragment — never sent to the server." },
  { icon: "local_fire_department", text: "Enable Burn after download to auto-delete a file after the first view." },
  { icon: "cloud_upload", text: "Files over 50 MB are uploaded in parallel chunks for speed." },
  { icon: "star", text: "Star important files on Drive to find them faster later." },
]


export default function ManageLandingPage() {
  const { user, files, stats, cdnAssets } = useAuth()

  const greeting = useMemo(
    () => GREETINGS[Math.floor(Math.random() * GREETINGS.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const tip = useMemo(
    () => TIPS[Math.floor(Math.random() * TIPS.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )


  const [feedback, setFeedback] = useState("")
  const [feedbackState, setFeedbackState] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const sendFeedback = async () => {
    if (!feedback.trim() || feedbackState === "sending") return
    setFeedbackState("sending")
    try {
      const res = await fetch("/api/v2/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedback }),
      })
      if (res.ok) {
        setFeedbackState("sent")
        setFeedback("")
        setTimeout(() => setFeedbackState("idle"), 3000)
      } else {
        setFeedbackState("error")
        setTimeout(() => setFeedbackState("idle"), 3000)
      }
    } catch {
      setFeedbackState("error")
      setTimeout(() => setFeedbackState("idle"), 3000)
    }
  }

  const name = user?.nickname || "there"
  const fileCount = files?.length || 0
  const starredCount = files?.filter(f => f.starred)?.length || 0
  const recentFiles = files?.slice(0, 5) || []
  const usedPct = stats?.storagePercent ?? 0
  const usedBytes = stats?.totalStorage || 0
  const maxBytes = stats?.maxStorage || 0
  const tier = user?.tier ?? (user?.premium ? "essential" : "free")
  const barColor = usedPct > 90 ? "#ef4444" : usedPct > 70 ? "#f59e0b" : "#171717"

  return (
    <div className="flex-1 flex flex-col gap-6">

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-[32px] md:text-[38px] font-semibold text-[#171717] tracking-tight leading-tight">
          {greeting(name)}
        </h1>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-stretch">

      <div className="flex flex-col gap-6">

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-6"
        >
          <div className="flex flex-col h-full" style={{ borderRadius: 12, backgroundColor: '#ffffff', padding: '20px', border: '1px solid #e5e5e5' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 text-[#333]">
                <MIcon name="database" size={18} className="text-[#999]" />
                <span className="text-[15px] font-medium">Storage</span>
              </div>
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-[#f5f5f5] text-[#171717]">
                {tier}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[#f5f5f5] mb-3 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${Math.min(usedPct, 100)}%`, backgroundColor: barColor }} />
            </div>
            <div className="text-[13px] text-[#333]">
              <span className="font-medium">{formatStorage(usedBytes)}</span>
              <span className="text-[#999] mx-1.5">of</span>
              {formatStorage(maxBytes)}
            </div>
          </div>

          <div className="flex flex-col h-full" style={{ borderRadius: 12, backgroundColor: '#ffffff', padding: '20px', border: '1px solid #e5e5e5' }}>
            <div className="flex items-center gap-2 mb-5 text-[#333]">
              <MIcon name="bar_chart" size={18} className="text-[#999]" />
              <span className="text-[15px] font-medium">Overview</span>
            </div>
            <div className="flex flex-col gap-3.5">
              {[
                { label: "Files", value: fileCount, icon: "description" },
                { label: "Starred", value: starredCount, icon: "star" },
                { label: "CDN Assets", value: cdnAssets.length, icon: "cloud" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-[#333]">
                    <MIcon name={s.icon} size={15} className="text-[#999]" />
                    <span className="text-[13px]">{s.label}</span>
                  </div>
                  <span className="text-[14px] font-semibold text-[#111]">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-0.5" 
          style={{ borderRadius: 16, backgroundColor: '#ffffff', padding: '6px', border: '1px solid #e5e5e5' }}
        >
          {[
            { icon: "hard_drive", label: "Drive", desc: "Manage your encrypted files", href: "/manage/files" },
            { icon: "cloud", label: "CDN Assets", desc: "Public asset hosting", href: "/manage/cdn" },
            { icon: "widgets", label: "Canvas", desc: "Infrastructure planner", href: "/manage/canvas" },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-3.5 hover:bg-[#f5f5f5] active:scale-[0.98] transition-all duration-75 px-4 py-3 rounded-[10px] group"
            >
              <MIcon name={action.icon} size={18} className="text-[#999] shrink-0" />
              <span className="text-[14px] text-[#333] flex-1 font-medium">{action.label}</span>
              <span className="text-[13px] text-[#999] hidden sm:block">{action.desc}</span>
              <MIcon name="chevron_right" size={16} className="text-[#999] shrink-0" />
            </Link>
          ))}
        </motion.div>

        {recentFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[13px] font-medium text-[#888]">Recent files</span>
              <Link href="/manage/files" className="flex items-center gap-1 text-[13px] text-[#888] hover:text-[#111] transition-colors">
                View all <MIcon name="arrow_forward" size={12} />
              </Link>
            </div>
            <div className="flex flex-col gap-0.5" style={{ borderRadius: 16, backgroundColor: '#ffffff', padding: '6px', border: '1px solid #e5e5e5' }}>
              {recentFiles.map((file) => (
                <Link
                   key={file.id}
                   href={`/d/${file.id}`}
                   className="flex items-center gap-3.5 hover:bg-[#f5f5f5] active:scale-[0.98] transition-all duration-75 px-4 py-3 rounded-[10px] group"
                >
                  <span className="text-[10px] font-bold tracking-wider text-[#666] bg-[#f0f0f0] border border-[#e5e5e5] px-2 py-0.5 rounded-md shrink-0">
                     {getFileExt(file.name)}
                   </span>
                  <span className="text-[14px] text-[#333] flex-1 min-w-0 truncate font-medium">
                    {file.name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {file.starred && <MIcon name="star" size={14} className="text-yellow-500" />}
                    <span className="text-[13px] text-[#999] hidden sm:block">
                      {new Date(file.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex flex-col gap-6">

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-start gap-3 w-full"
          style={{ borderRadius: 16, padding: '20px', backgroundColor: '#ffffff', border: '1px solid #e5e5e5' }}
        >
          <MIcon name={tip.icon} size={18} className="text-[#888] shrink-0 mt-0.5" />
          <p className="text-[14px] text-[#333] leading-relaxed font-medium">{tip.text}</p>
        </motion.div>



        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 flex flex-col"
          style={{ borderRadius: 16, padding: '20px', backgroundColor: '#ffffff', border: '1px solid #e5e5e5', minHeight: '240px' }}
        >
          <div className="flex items-center gap-2 mb-2 text-[#111]">
            <MIcon name="mail" size={18} className="text-[#888]" />
            <span className="text-[15px] font-medium">Send Feedback</span>
          </div>
          <p className="text-[13px] text-[#666] mb-4 leading-relaxed">
            Anonymous. We read every message.
          </p>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendFeedback() }}
            placeholder="What's on your mind?"
            maxLength={1000}
            disabled={feedbackState === "sending" || feedbackState === "sent"}
            className="flex-1 w-full resize-none outline-none placeholder:text-[#999] transition-colors focus:bg-[#fafafa] bg-[#f5f5f5] border border-[#e5e5e5] rounded-[10px] p-3 text-[14px] text-[#111] mb-4 min-h-[80px]"
          />
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#999] font-medium">{feedback.length}/1000</span>
            <button
              onClick={sendFeedback}
              disabled={!feedback.trim() || feedbackState === "sending" || feedbackState === "sent"}
              className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-medium transition-all duration-75 bg-[#f0f0f0] active:scale-[0.97] border border-[#e5e5e5]
                ${feedbackState === "sent" ? "text-emerald-600" : feedbackState === "error" ? "text-red-500" : !feedback.trim() ? "text-[#999] cursor-not-allowed" : "text-[#333] hover:bg-[#e5e5e5]"}
              `}
            >
              <MIcon
                name={feedbackState === "sent" ? "check" : feedbackState === "error" ? "error" : feedbackState === "sending" ? "hourglass_empty" : "send"}
                size={16}
              />
              {feedbackState === "sent" ? "Sent!" : feedbackState === "error" ? "Failed" : feedbackState === "sending" ? "Sending..." : "Send"}
            </button>
          </div>
        </motion.div>

      </div>
      </div>
    </div>
  )
}
