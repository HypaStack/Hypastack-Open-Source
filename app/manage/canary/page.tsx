"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { motion } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"

const EXPERIMENTAL_FEATURES = [
  {
    icon: "speed",
    label: "HypaDrive Sync v2",
    desc: "Next-generation background syncing",
    status: "Coming soon",
  },
  {
    icon: "terminal",
    label: "Developer API",
    desc: "Programmatic access via REST",
    status: "Coming soon",
  },
  {
    icon: "auto_awesome",
    label: "AI File Tagging",
    desc: "Automatic content classification",
    status: "In development",
  },
]

const PERKS = [
  { icon: "rocket_launch", text: "Early access to new features before public release" },
  { icon: "bug_report", text: "Help shape the product by reporting bugs directly" },
  { icon: "verified", text: "Insider badge visible on your account" },
  { icon: "notifications", text: "Priority support and direct developer contact" },
]

export default function CanaryPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && user.is_insider !== 1) {
      router.push("/manage")
    }
  }, [user, router])

  if (!user || user.is_insider !== 1) return null

  return (
    <div className="flex-1 flex flex-col gap-4">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-3"
      >
        <h1 className="text-[28px] font-medium tracking-tight text-[#171717] dark:text-[#e3e3e3]">Insider Program</h1>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308',
          padding: '3px 7px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', lineHeight: 1,
        }}>
          Canary Build
        </span>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-start">

        {/* ── Left column ── */}
        <div className="flex flex-col gap-4">

          {/* Welcome card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            style={{ borderRadius: 12, backgroundColor: '#ffffff', padding: '14px 16px', border: '1px solid #e5e5e5' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <MIcon name="science" size={18} style={{ color: 'rgba(0,0,0,0.5)' }} />
              <span style={{ fontSize: 15, fontWeight: 500, color: '#333' }}>Welcome, {user.nickname}</span>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.06)',
                padding: '2px 6px', borderRadius: 5, marginLeft: 'auto',
              }}>
                v2.7.3-insider
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', lineHeight: 1.6 }}>
              You have early access to experimental features and builds before they ship to the public.
              Expect occasional instability — please report any bugs you find.
            </p>
          </motion.div>

          {/* Experimental features */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col overflow-hidden"
            style={{ borderRadius: 12, backgroundColor: '#ffffff', padding: '14px 16px', border: '1px solid #e5e5e5' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <MIcon name="labs" size={18} style={{ color: 'rgba(0,0,0,0.5)' }} />
              <span style={{ fontSize: 15, fontWeight: 500, color: '#333' }}>Experimental Features</span>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.35)', marginBottom: 12, lineHeight: 1.5 }}>
              These features are in active development and may change or break at any time.
            </p>
            <div className="flex flex-col">
              {EXPERIMENTAL_FEATURES.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center gap-3 hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-all duration-75"
                  style={{ height: 48, paddingLeft: 12, paddingRight: 12, borderRadius: 12, margin: '2px 0' }}
                >
                  <MIcon name={f.icon} size={15} style={{ color: 'rgba(0,0,0,0.4)', flexShrink: 0 }} />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>{f.label}</span>
                    <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)' }}>{f.desc}</span>
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                    color: 'rgba(0,0,0,0.35)', backgroundColor: 'rgba(0,0,0,0.06)',
                    padding: '2px 6px', borderRadius: 5, flexShrink: 0,
                  }}>
                    {f.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-4">

          {/* Perks */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col overflow-hidden"
            style={{ borderRadius: 12, backgroundColor: '#ffffff', padding: '14px 16px', border: '1px solid #e5e5e5' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <MIcon name="star" size={18} style={{ color: 'rgba(0,0,0,0.5)' }} />
              <span style={{ fontSize: 15, fontWeight: 500, color: '#333' }}>Your Perks</span>
            </div>
            <div className="flex flex-col">
              {PERKS.map((p) => (
                <div
                  key={p.text}
                  className="flex items-start gap-3"
                  style={{ paddingTop: 8, paddingBottom: 8, paddingLeft: 4 }}
                >
                  <MIcon name={p.icon} size={14} style={{ color: 'rgba(0,0,0,0.4)', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', lineHeight: 1.5 }}>{p.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Build info */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-start gap-3"
            style={{ borderRadius: 12, backgroundColor: '#ffffff', padding: '14px 16px', border: '1px solid #e5e5e5' }}
          >
            <MIcon name="info" size={15} style={{ color: 'rgba(0,0,0,0.4)', flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', lineHeight: 1.6 }}>
              You're on <span style={{ color: '#333', fontWeight: 500 }}>v2.7.3-insider</span>. Bugs and
              unexpected behaviour should be reported directly to the developer.
            </p>
          </motion.div>

        </div>
      </div>
    </div>
  )
}
