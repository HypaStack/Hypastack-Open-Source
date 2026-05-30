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
  const barColor = usedPct > 90 ? "#ef4444" : usedPct > 70 ? "#f59e0b" : "#9b9b9b"

  return (
    <div className="flex-1 flex flex-col gap-4">

      {/* Greeting — full width above the grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-[38px] font-semibold text-white tracking-tight leading-tight">
          {greeting(name)}
        </h1>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-stretch">

      {/* ── Left column ── */}
      <div className="flex flex-col gap-4">

        {/* Storage + Quick actions side by side */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-2 gap-4"
        >
          {/* Storage card */}
          <div className="flex flex-col h-full" style={{ borderRadius: 16, padding: '14px 16px', backgroundColor: '#171717' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MIcon name="database" size={18} style={{ color: 'rgba(255,255,255,0.6)' }} />
                  <span style={{ fontSize: 15, fontWeight: 500, color: '#e3e3e3' }}>Storage</span>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                  paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2,
                  borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)', color: '#ffffff'
                }}>
                  {tier}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 10 }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${Math.min(usedPct, 100)}%`,
                  backgroundColor: barColor,
                  transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                }} />
              </div>
              <span style={{ fontSize: 13, color: '#e3e3e3' }}>
                <span style={{ fontWeight: 500 }}>{formatStorage(usedBytes)}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}> of </span>
                {formatStorage(maxBytes)}
              </span>
          </div>

          {/* Stats card */}
          <div className="flex flex-col h-full" style={{ borderRadius: 16, padding: '14px 16px', backgroundColor: '#171717' }}>
              <div className="flex items-center gap-2 mb-3">
                <MIcon name="bar_chart" size={18} style={{ color: 'rgba(255,255,255,0.6)' }} />
                <span style={{ fontSize: 15, fontWeight: 500, color: '#e3e3e3' }}>Overview</span>
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Files", value: fileCount, icon: "description" },
                  { label: "Starred", value: starredCount, icon: "star" },
                  { label: "CDN Assets", value: cdnAssets.length, icon: "cloud" },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MIcon name={s.icon} size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
                      <span style={{ fontSize: 13, color: '#e3e3e3' }}>{s.label}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>{s.value}</span>
                  </div>
                ))}
              </div>
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col h-full overflow-hidden" 
          style={{ borderRadius: 16, backgroundColor: '#171717', padding: '14px 16px' }}
        >
            {[
              { icon: "hard_drive", label: "Drive", desc: "Manage your encrypted files", href: "/manage/files" },
              { icon: "cloud", label: "CDN Assets", desc: "Public asset hosting", href: "/manage/cdn" },
              { icon: "widgets", label: "Canvas", desc: "Infrastructure planner", href: "/manage/canvas" },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75"
                style={{ height: 42, paddingLeft: 12, paddingRight: 12, borderRadius: 12, margin: '2px 4px' }}
              >
                <MIcon name={action.icon} size={15} style={{ color: 'rgba(255,255,255,0.6)', flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 400, color: '#e3e3e3', flex: 1 }}>{action.label}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{action.desc}</span>
                <MIcon name="chevron_right" size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
              </Link>
            ))}
        </motion.div>

        {/* Recent files */}
        {recentFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between mb-2" style={{ paddingLeft: 4, paddingRight: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>Recent files</span>
              <Link
                href="/manage/files"
                className="flex items-center gap-1 hover:text-white transition-colors duration-75"
                style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}
              >
                View all <MIcon name="arrow_forward" size={11} />
              </Link>
            </div>
            <div className="flex flex-col h-full overflow-hidden py-2" style={{ borderRadius: 16, backgroundColor: '#171717' }}>
                {recentFiles.map((file) => (
                  <Link
                    key={file.id}
                    href={`/d/${file.id}`}
                    className="flex items-center gap-3 hover:bg-[#1a1a1a] active:scale-[0.99] transition-all duration-75"
                    style={{ height: 38, paddingLeft: 12, paddingRight: 12, borderRadius: 12, margin: '2px 4px' }}
                  >
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.5)',
                      backgroundColor: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 5, flexShrink: 0
                    }}>
                      {getFileExt(file.name)}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 400, color: '#e3e3e3', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {file.starred && <MIcon name="star" size={12} style={{ color: '#ca8a04' }} />}
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                        {new Date(file.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </Link>
                ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Right column ── */}
      <div className="flex flex-col gap-4">

        {/* Tip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-start gap-3 h-full"
          style={{ borderRadius: 16, backgroundColor: '#171717', padding: '14px 16px' }}
        >
          <MIcon name={tip.icon} size={15} style={{ color: 'rgba(255,255,255,0.6)', flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 13, color: '#e3e3e3', lineHeight: 1.55 }}>{tip.text}</p>
        </motion.div>



        {/* Feedback */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 flex flex-col"
          style={{ borderRadius: 16, backgroundColor: '#171717', padding: '14px 16px' }}
        >
            <div className="flex items-center gap-2 mb-2">
              <MIcon name="mail" size={18} style={{ color: 'rgba(255,255,255,0.6)' }} />
              <span style={{ fontSize: 15, fontWeight: 500, color: '#e3e3e3' }}>Send Feedback</span>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10, lineHeight: 1.5 }}>
              Anonymous. We read every message.
            </p>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendFeedback() }}
              placeholder="What's on your mind?"
              maxLength={1000}
              disabled={feedbackState === "sending" || feedbackState === "sent"}
              className="flex-1 w-full resize-none outline-none placeholder:text-[rgba(255,255,255,0.2)] transition-colors focus:bg-[#1a1a1a]"
              style={{
                backgroundColor: '#1f1f1f',
                borderRadius: 14,
                padding: '10px 12px',
                fontSize: 13,
                color: '#e3e3e3',
                fontFamily: 'inherit',
                border: 'none',
                marginBottom: 8,
                minHeight: 60,
              }}
            />
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>{feedback.length}/1000</span>
              <button
                onClick={sendFeedback}
                disabled={!feedback.trim() || feedbackState === "sending" || feedbackState === "sent"}
                className="flex items-center gap-1.5 hover:bg-[#313131] active:scale-[0.97] transition-all duration-75"
                style={{
                  height: 34,
                  paddingLeft: 12,
                  paddingRight: 12,
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 400,
                  color: feedbackState === "sent" ? '#4ade80' : feedbackState === "error" ? '#f87171' : (!feedback.trim() ? 'rgba(255,255,255,0.25)' : '#e3e3e3'),
                  cursor: (!feedback.trim() || feedbackState !== "idle") ? 'not-allowed' : 'pointer',
                  backgroundColor: '#1f1f1f',
                }}
              >
                <MIcon
                  name={feedbackState === "sent" ? "check" : feedbackState === "error" ? "error" : feedbackState === "sending" ? "hourglass_empty" : "send"}
                  size={14}
                />
                {feedbackState === "sent" ? "Sent!" : feedbackState === "error" ? "Failed" : feedbackState === "sending" ? "Sending…" : "Send"}
              </button>
            </div>
        </motion.div>

      </div>
      {/* close grid */}
      </div>
    </div>
  )
}
