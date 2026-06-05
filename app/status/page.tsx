"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MIcon } from "@/components/ui/material-icon"

interface StatusSnapshot {
  timestamp: number
  uptime: number
  postgres: {
    ping: number
    timestamp: number
    writeReadDelete: { writeMs: number; readMs: number; deleteMs: number }
    pool: { totalCount: number; idleCount: number; waitingCount: number }
    counts: { users: number; files: number; cdnAssets: number }
    countLatency: { usersMs: number; filesMs: number; cdnMs: number }
  }
  r2: { headMs: number }
  auth: { pbkdf2HashMs: number; pbkdf2VerifyMs: number; jwtSignMs: number; jwtVerifyMs: number }
  crypto: {
    aesEncryptMs: number; aesDecryptMs: number
    sha256Ms: number; sha256ThroughputMBps: number
    hmacMs: number; csprngMs: number
  }
  system: {
    nodeVersion: string; opensslVersion: string
    platform: string; arch: string
    memoryUsedMB: number; memoryTotalMB: number; cpuCount: number
  }
}

function formatUptime(s: number) {
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${sec}s`
  return `${m}m ${sec}s`
}

function msColor(ms: number, good = 20, warn = 80) {
  if (ms < 0) return "text-[#aaa]"
  if (ms <= good) return "text-emerald-600"
  if (ms <= warn) return "text-amber-500"
  return "text-red-500"
}

function StatusDot({ ms, good = 20, warn = 80, isLoading = false }: { ms: number; good?: number; warn?: number; isLoading?: boolean }) {
  if (isLoading) return <MIcon name="progress_activity" size={13} className="text-[#bbb] animate-spin" />
  const c = ms < 0 ? "bg-[#ddd]" : ms <= good ? "bg-emerald-500" : ms <= warn ? "bg-amber-400" : "bg-red-500"
  return (
    <span className="relative flex h-2 w-2">
      {ms >= 0 && ms <= good && <span className={`absolute inset-0 rounded-full ${c} animate-ping opacity-40`} />}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${c}`} />
    </span>
  )
}

function MetricRow({ label, value, unit = "ms", good = 20, warn = 80, isLoading = false }: {
  label: string; value: number; unit?: string; good?: number; warn?: number; isLoading?: boolean
}) {
  return (
    <div
      className="flex items-center justify-between hover:bg-[#f5f5f5] transition-colors cursor-default"
      style={{ height: 36, paddingLeft: 12, paddingRight: 12, borderRadius: 10 }}
    >
      <span style={{ fontSize: 13, color: '#444' }}>{label}</span>
      <div className="flex items-center gap-2">
        <StatusDot ms={value} good={good} warn={warn} isLoading={isLoading} />
        <span className={`text-[13px] font-mono tabular-nums ${msColor(value, good, warn)}`}>
          {isLoading ? "—" : value < 0 ? "err" : value.toFixed(2)}
        </span>
        {!isLoading && value >= 0 && <span style={{ fontSize: 11, color: '#bbb', fontWeight: 500 }}>{unit}</span>}
      </div>
    </div>
  )
}

function InfoRow({ label, value, isLoading = false }: { label: string; value: string; isLoading?: boolean }) {
  return (
    <div
      className="flex items-center justify-between hover:bg-[#f5f5f5] transition-colors cursor-default"
      style={{ height: 36, paddingLeft: 12, paddingRight: 12, borderRadius: 10 }}
    >
      <span style={{ fontSize: 13, color: '#444' }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#111' }}>
        {isLoading ? "—" : value}
      </span>
    </div>
  )
}

function SectionCard({ icon, title, badge, children, delay = 0 }: {
  icon: string; title: string; badge?: string; children: React.ReactNode; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ backgroundColor: '#ffffff', borderRadius: 20, border: '1px solid #e5e5e5', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ height: 30, width: 30, borderRadius: 10, backgroundColor: '#f5f5f5', border: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MIcon name={icon} size={14} style={{ color: '#888' }} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#111', letterSpacing: '-0.01em' }}>{title}</span>
        {badge && (
          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999', backgroundColor: '#f5f5f5', border: '1px solid #ebebeb', padding: '2px 8px', borderRadius: 6 }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ padding: '6px 8px 8px' }}>
        {children}
      </div>
    </motion.div>
  )
}

function Sparkline({ data, color = "#10b981", height = 28 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const w = 80
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(" ")
  return (
    <svg width={w} height={height} className="shrink-0 opacity-60">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  )
}

const MAX_HISTORY = 30
const POLL_INTERVAL_MS = 5000

export default function StatusPage() {
  const [snapshot, setSnapshot] = useState<StatusSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const pingHistory = useRef<number[]>([])
  const r2History = useRef<number[]>([])
  const authHistory = useRef<number[]>([])

  const fetchSnapshot = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await fetch("/api/v2/status", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: StatusSnapshot = await res.json()
      pingHistory.current = [...pingHistory.current.slice(-(MAX_HISTORY - 1)), data.postgres.ping]
      r2History.current = [...r2History.current.slice(-(MAX_HISTORY - 1)), data.r2.headMs]
      authHistory.current = [...authHistory.current.slice(-(MAX_HISTORY - 1)), data.auth.jwtVerifyMs]
      setSnapshot(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (e: any) {
      setError(e.message || "Failed to load")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchSnapshot()
    const interval = setInterval(() => fetchSnapshot(true), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  const s = snapshot

  return (
    <main className="min-h-screen bg-white text-[#111]" style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>
      <Navbar />

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-32 pb-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', color: '#111' }}>System Status</h1>
            <span className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
            {lastUpdated && (
              <span style={{ fontSize: 12, color: '#bbb', marginLeft: 'auto' }}>
                Updated {lastUpdated.toLocaleTimeString()}
                {refreshing && <MIcon name="progress_activity" size={12} className="inline ml-1.5 animate-spin text-[#ccc]" />}
              </span>
            )}
          </div>
          <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6, marginTop: 4 }}>
            Real-time infrastructure benchmarks. Refreshes every 5 seconds.
          </p>
        </motion.div>
      </div>

      {loading && (
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-24 flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-[#ddd]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p style={{ fontSize: 13, color: '#bbb' }}>Running benchmarks…</p>
        </div>
      )}

      {error && !s && (
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-20 text-center">
          <MIcon name="error" size={40} className="text-red-400 mx-auto mb-3" />
          <p style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>Failed to load benchmarks</p>
          <p style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>{error}</p>
          <button
            onClick={() => { setLoading(true); fetchSnapshot() }}
            className="mt-5 hover:bg-[#f0f0f0] active:scale-[0.97] transition-all"
            style={{ height: 36, paddingLeft: 16, paddingRight: 16, borderRadius: 10, fontSize: 13, fontWeight: 500, color: '#333', backgroundColor: '#f5f5f5', border: '1px solid #e5e5e5' }}
          >
            Retry
          </button>
        </div>
      )}

      {s && (
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-20">

          {/* Top key metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: "DB Ping", value: s.postgres.ping, history: pingHistory.current, color: "#10b981", good: 20, warn: 80 },
              { label: "R2 HEAD", value: s.r2.headMs, history: r2History.current, color: "#6366f1", good: 150, warn: 400 },
              { label: "JWT Verify", value: s.auth.jwtVerifyMs, history: authHistory.current, color: "#f59e0b", good: 1, warn: 5 },
            ].map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 * i }}
                style={{ backgroundColor: '#ffffff', borderRadius: 18, border: '1px solid #e5e5e5', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              >
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#bbb', marginBottom: 6 }}>{m.label}</p>
                  <p className={`font-mono tabular-nums leading-none ${msColor(m.value, m.good, m.warn)}`} style={{ fontSize: 28, fontWeight: 700 }}>
                    {m.value < 0 ? "ERR" : m.value.toFixed(1)}
                    <span style={{ fontSize: 12, color: '#ccc', marginLeft: 4, fontWeight: 500 }}>ms</span>
                  </p>
                </div>
                <Sparkline data={m.history} color={m.color} />
              </motion.div>
            ))}
          </div>

          {/* Detail sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <SectionCard icon="database" title="PostgreSQL" badge="MVCC" delay={0.05}>
              <MetricRow label="SELECT 1 (ping)" value={s.postgres.ping} />
              <MetricRow label="SELECT NOW()" value={s.postgres.timestamp} />
              <MetricRow label="INSERT (write)" value={s.postgres.writeReadDelete.writeMs} good={10} warn={50} />
              <MetricRow label="SELECT (read)" value={s.postgres.writeReadDelete.readMs} />
              <MetricRow label="DELETE" value={s.postgres.writeReadDelete.deleteMs} />
              <MetricRow label="COUNT users" value={s.postgres.countLatency.usersMs} />
              <MetricRow label="COUNT files" value={s.postgres.countLatency.filesMs} />
              <MetricRow label="COUNT cdn_assets" value={s.postgres.countLatency.cdnMs} />
              <div style={{ height: 1, backgroundColor: '#f0f0f0', margin: '4px 4px' }} />
              <InfoRow label="Pool connections" value={`${s.postgres.pool.totalCount} total · ${s.postgres.pool.idleCount} idle · ${s.postgres.pool.waitingCount} waiting`} />
              <InfoRow label="Row counts" value={`${s.postgres.counts.users.toLocaleString()} users · ${s.postgres.counts.files.toLocaleString()} files · ${s.postgres.counts.cdnAssets.toLocaleString()} cdn`} />
            </SectionCard>

            <SectionCard icon="cloud" title="Cloudflare R2" badge="S3" delay={0.1}>
              <MetricRow label="HEAD (network round-trip)" value={s.r2.headMs} good={150} warn={400} />
              <div style={{ margin: '6px 4px 4px', padding: '10px 12px', backgroundColor: '#f9f9f9', borderRadius: 10, border: '1px solid #f0f0f0' }}>
                <p style={{ fontSize: 12, color: '#999', lineHeight: 1.6 }}>
                  Measures raw network latency to the Cloudflare storage bucket. PUT and DELETE are excluded to avoid burning Class A billing operations.
                </p>
              </div>
            </SectionCard>

            <SectionCard icon="lock" title="Authentication" badge="PBKDF2" delay={0.15}>
              <MetricRow label="PBKDF2 hash (100k iter)" value={s.auth.pbkdf2HashMs} good={100} warn={300} />
              <MetricRow label="PBKDF2 verify" value={s.auth.pbkdf2VerifyMs} good={100} warn={300} />
              <MetricRow label="JWT sign (HMAC-SHA256)" value={s.auth.jwtSignMs} good={1} warn={5} />
              <MetricRow label="JWT verify" value={s.auth.jwtVerifyMs} good={1} warn={5} />
            </SectionCard>

            <SectionCard icon="shield" title="Cryptography" badge="AES-256-GCM" delay={0.2}>
              <MetricRow label="AES-256-GCM encrypt" value={s.crypto.aesEncryptMs} good={1} warn={5} />
              <MetricRow label="AES-256-GCM decrypt" value={s.crypto.aesDecryptMs} good={1} warn={5} />
              <MetricRow label="SHA-256 (1 MB)" value={s.crypto.sha256Ms} good={5} warn={20} />
              <MetricRow label="HMAC-SHA256 (4 KB)" value={s.crypto.hmacMs} good={1} warn={5} />
              <MetricRow label="CSPRNG (1 KB)" value={s.crypto.csprngMs} good={1} warn={5} />
              <div style={{ height: 1, backgroundColor: '#f0f0f0', margin: '4px 4px' }} />
              <InfoRow label="SHA-256 throughput" value={`${s.crypto.sha256ThroughputMBps.toFixed(0)} MB/s`} />
            </SectionCard>
          </div>

          {/* System info bar */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            style={{ marginTop: 16, backgroundColor: '#ffffff', borderRadius: 20, border: '1px solid #e5e5e5', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-center gap-2 mb-5">
              <MIcon name="dns" size={14} style={{ color: '#bbb' }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#bbb' }}>Runtime</span>
              <span style={{ fontSize: 11, color: '#ccc', marginLeft: 'auto' }}>Uptime: {formatUptime(s.uptime)}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-6 gap-y-4">
              {[
                { label: "Node.js", value: s.system.nodeVersion },
                { label: "OpenSSL", value: s.system.opensslVersion },
                { label: "Platform", value: s.system.platform },
                { label: "Arch", value: s.system.arch },
                { label: "CPUs", value: `${s.system.cpuCount}` },
                { label: "Heap Used", value: `${s.system.memoryUsedMB} MB` },
                { label: "Heap Total", value: `${s.system.memoryTotalMB} MB` },
              ].map((item) => (
                <div key={item.label}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#ccc', marginBottom: 2 }}>{item.label}</p>
                  <p style={{ fontSize: 13, fontFamily: 'monospace', color: '#333' }}>{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#ccc', marginTop: 24 }}>
            Benchmarks run server-side on each poll. All metrics reflect live infrastructure.
          </p>
        </div>
      )}

      <Footer />
    </main>
  )
}
