"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import Link from "next/link"
import { MIcon } from "@/components/ui/material-icon"

// ── Types ──────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────

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
  if (ms < 0) return "text-[#555]"
  if (ms <= good) return "text-emerald-400"
  if (ms <= warn) return "text-amber-400"
  return "text-red-400"
}

function msBg(ms: number, good = 20, warn = 80) {
  if (ms < 0) return "bg-[#1f1f1f]"
  if (ms <= good) return "bg-[#1f1f1f]"
  if (ms <= warn) return "bg-[#171717]"
  return "bg-[#1f1f1f]"
}

function StatusDot({ ms, good = 20, warn = 80, isLoading = false }: { ms: number; good?: number; warn?: number; isLoading?: boolean }) {
  if (isLoading) {
    return <MIcon name="progress_activity" size={14} className="text-[#888] animate-spin" />
  }
  const c = ms < 0 ? "bg-[#555]" : ms <= good ? "bg-emerald-400" : ms <= warn ? "bg-amber-400" : "bg-red-400"
  return (
    <span className="relative flex h-2.5 w-2.5">
      {ms >= 0 && ms <= good && (
        <span className={`absolute inset-0 rounded-full ${c} animate-ping opacity-40`} />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${c}`} />
    </span>
  )
}

// ── Metric Row ─────────────────────────────────────────────────

function MetricRow({ label, value, unit = "ms", good = 20, warn = 80, isLoading = false }: {
  label: string; value: number; unit?: string; good?: number; warn?: number; isLoading?: boolean
}) {
  return (
    <div className="flex items-center justify-between hover:bg-[#313131] active:scale-[0.97] transition-all cursor-default" style={{ height: '34px', paddingLeft: '12px', paddingRight: '12px', borderRadius: '16px' }}>
      <span className="text-[14px] text-[#e3e3e3]">{label}</span>
      <div className="flex items-center gap-2">
        <StatusDot ms={value} good={good} warn={warn} isLoading={isLoading} />
        <span className={`text-[13px] font-mono tabular-nums ${msColor(value, good, warn)}`}>
          {value < 0 ? "err" : `${value.toFixed(2)}`}
        </span>
        <span className="text-[11px] text-[#555] font-medium">{unit}</span>
      </div>
    </div>
  )
}

// ── Section Card ───────────────────────────────────────────────

function SectionCard({ icon, title, badge, children, delay = 0 }: {
  icon: string
  title: string; badge?: string; children: React.ReactNode; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-[20px] overflow-hidden relative`}
      style={{ backgroundColor: '#1f1f1f', padding: '4px' }}
    >
      <div className="flex items-center gap-3 px-3 py-2 mb-1">
        <div className="h-8 w-8 rounded-[12px] flex items-center justify-center bg-transparent">
          <MIcon name={icon} size={15} style={{ color: 'rgba(255,255,255,0.6)' }} />
        </div>
        <h2 className="text-[14px] font-semibold text-[#e3e3e3] tracking-tight">{title}</h2>
        {badge && (
          <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-[#555] px-2.5 py-1 rounded-[10px]" style={{ backgroundColor: '#111' }}>
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-col">{children}</div>
    </motion.div>
  )
}

// ── Sparkline ──────────────────────────────────────────────────

function Sparkline({ data, color = "#10b981", height = 32 }: {
  data: number[]; color?: string; height?: number
}) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const w = 120
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(" ")

  return (
    <svg width={w} height={height} className="shrink-0 opacity-70">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  )
}

// ── History ring buffer ────────────────────────────────────────

const MAX_HISTORY = 30

function useHistory() {
  const ref = useRef<number[]>([])
  const push = useCallback((v: number) => {
    ref.current = [...ref.current.slice(-(MAX_HISTORY - 1)), v]
    return ref.current
  }, [])
  return { data: ref.current, push }
}

// ── Main Page ──────────────────────────────────────────────────

export default function StatusPage() {
  const [snapshot, setSnapshot] = useState<StatusSnapshot | null>(null)
  
  // Track visual cascade loading state
  const [updating, setUpdating] = useState({
    top: false,
    postgres: false,
    r2: false,
    auth: false,
    crypto: false,
    system: false
  })
  
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tickCount, setTickCount] = useState(0)

  // History buffers for sparklines
  const pingHistory = useRef<number[]>([])
  const r2History = useRef<number[]>([])
  const authHistory = useRef<number[]>([])

  // Store timeouts so we can clean them up if the component unmounts
  const timeoutRefs = useRef<NodeJS.Timeout[]>([])

  useEffect(() => {
    let eventSource: EventSource | null = null

    const connect = () => {
      eventSource = new EventSource("/api/v2/status")

      eventSource.onopen = () => {
        setConnected(true)
        setError(null)
      }

      eventSource.onmessage = (e) => {
        try {
          const incoming: StatusSnapshot = JSON.parse(e.data)
          
          setSnapshot(prevSnapshot => {
            if (!prevSnapshot) {
              // Initial load, no cascade needed
              setTickCount(1)
              pingHistory.current = [...pingHistory.current.slice(-(MAX_HISTORY - 1)), incoming.postgres.ping]
              r2History.current = [...r2History.current.slice(-(MAX_HISTORY - 1)), incoming.r2.headMs]
              authHistory.current = [...authHistory.current.slice(-(MAX_HISTORY - 1)), incoming.auth.jwtVerifyMs]
              return incoming
            }

            // Start cascade for subsequent updates
            setUpdating({ top: true, postgres: true, r2: true, auth: true, crypto: true, system: true })
            
            // Clear any existing cascading timeouts if they overlap
            timeoutRefs.current.forEach(clearTimeout)
            timeoutRefs.current = []

            timeoutRefs.current.push(setTimeout(() => {
              setSnapshot(p => p ? { ...p, postgres: { ...p.postgres, ping: incoming.postgres.ping }, r2: { ...p.r2, headMs: incoming.r2.headMs }, auth: { ...p.auth, jwtVerifyMs: incoming.auth.jwtVerifyMs } } : incoming)
              setUpdating(u => ({ ...u, top: false }))
            }, 150))

            timeoutRefs.current.push(setTimeout(() => {
              setSnapshot(p => p ? { ...p, postgres: incoming.postgres } : incoming)
              setUpdating(u => ({ ...u, postgres: false }))
            }, 300))

            timeoutRefs.current.push(setTimeout(() => {
              setSnapshot(p => p ? { ...p, r2: incoming.r2 } : incoming)
              setUpdating(u => ({ ...u, r2: false }))
            }, 450))

            timeoutRefs.current.push(setTimeout(() => {
              setSnapshot(p => p ? { ...p, auth: incoming.auth } : incoming)
              setUpdating(u => ({ ...u, auth: false }))
            }, 600))

            timeoutRefs.current.push(setTimeout(() => {
              setSnapshot(p => p ? { ...p, crypto: incoming.crypto } : incoming)
              setUpdating(u => ({ ...u, crypto: false }))
            }, 750))

            timeoutRefs.current.push(setTimeout(() => {
              // Final sync and system
              setTickCount((p) => p + 1)
              pingHistory.current = [...pingHistory.current.slice(-(MAX_HISTORY - 1)), incoming.postgres.ping]
              r2History.current = [...r2History.current.slice(-(MAX_HISTORY - 1)), incoming.r2.headMs]
              authHistory.current = [...authHistory.current.slice(-(MAX_HISTORY - 1)), incoming.auth.jwtVerifyMs]
              setUpdating(u => ({ ...u, system: false }))
              setSnapshot(incoming) // ensure perfectly synchronized with incoming payload
            }, 900))

            return prevSnapshot // Don't change snapshot synchronously if we are cascading
          })
          
        } catch (err) {
          console.error("[Status] Failed to parse SSE data:", err, e.data?.slice(0, 200))
        }
      }

      eventSource.onerror = () => {
        setConnected(false)
        setError("Connection lost. Reconnecting...")
      }
    }

    connect()

    return () => {
      eventSource?.close()
      timeoutRefs.current.forEach(clearTimeout)
    }
  }, [])

  const s = snapshot

  return (
    <main className="min-h-screen bg-[#0c0c0e] text-white">
      {/* Header */}
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2 text-[#888] hover:text-white transition-colors">
            <MIcon name="arrow_back" size={16} />
            <span className="text-[13px] font-medium">Back</span>
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
          <div className="flex items-center gap-4 mb-2">
            <img src="https://r2.hypastack.com/cdn/u1y77k752jdm/icon.webp" alt="" className="select-none pointer-events-none h-10 w-10 rounded-[10px]" draggable={false} />
            <h1 className="text-[32px] sm:text-[40px] font-bold tracking-tight" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>
              System Status
            </h1>
          </div>
          <p className="text-[15px] text-[#888] max-w-xl leading-relaxed mt-2 mb-1">
            Real-time infrastructure metrics.
          </p>
        </motion.div>
      </div>

      {/* Error state */}
      {error && !s && (
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-20 text-center">
          <MIcon name="error" size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-[18px] font-semibold text-red-400 mb-2">Failed to load status</p>
          <p className="text-[14px] text-[#888]">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {!s && !error && (
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-20 text-center">
          <img src="https://r2.hypastack.com/cdn/u1y77k752jdm/icon.webp" alt="" className="select-none pointer-events-none h-8 w-8 rounded-[6px] mx-auto mb-4 animate-[spin_1.2s_ease-in-out_infinite]" draggable={false} />
          <p className="text-[14px] text-[#888]">Running benchmarks…</p>
        </div>
      )}

      {/* Metrics Grid */}
      {s && (
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-16">
          {/* Key latency cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 mt-6">
            {[
              { label: "DB Ping", value: s.postgres.ping, history: pingHistory.current, color: "#10b981" },
              { label: "R2 HEAD", value: s.r2.headMs, history: r2History.current, color: "#6366f1" },
              { label: "JWT Verify", value: s.auth.jwtVerifyMs, history: authHistory.current, color: "#f59e0b" },
            ].map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * i }}
                className={`rounded-[20px] p-5 flex items-center justify-between relative`}
                style={{ backgroundColor: '#1f1f1f' }}
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    {updating.top && <MIcon name="progress_activity" size={12} className="text-[#888] animate-spin" />}
                    <p className="text-[11px] uppercase tracking-wider text-[#555] font-semibold">{m.label}</p>
                  </div>
                  <p className={`text-[26px] font-bold font-mono tabular-nums leading-none ${msColor(m.value)}`}>
                    {m.value < 0 ? "ERR" : m.value.toFixed(1)}
                    <span className="text-[12px] text-[#555] ml-1 font-medium">ms</span>
                  </p>
                </div>
                <Sparkline data={m.history} color={m.color} />
              </motion.div>
            ))}
          </div>

          {/* Detail sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* PostgreSQL */}
            <SectionCard icon="database" title="PostgreSQL" badge="MVCC" delay={0.1}>
              <MetricRow label="SELECT 1 (ping)" value={s.postgres.ping} isLoading={updating.postgres} />
              <MetricRow label="SELECT NOW()" value={s.postgres.timestamp} isLoading={updating.postgres} />
              <MetricRow label="INSERT (write)" value={s.postgres.writeReadDelete.writeMs} good={10} warn={50} isLoading={updating.postgres} />
              <MetricRow label="SELECT (read)" value={s.postgres.writeReadDelete.readMs} isLoading={updating.postgres} />
              <MetricRow label="DELETE" value={s.postgres.writeReadDelete.deleteMs} isLoading={updating.postgres} />
              <MetricRow label="COUNT users" value={s.postgres.countLatency.usersMs} isLoading={updating.postgres} />
              <MetricRow label="COUNT files" value={s.postgres.countLatency.filesMs} isLoading={updating.postgres} />
              <MetricRow label="COUNT cdn_assets" value={s.postgres.countLatency.cdnMs} isLoading={updating.postgres} />
              <div className="flex items-center justify-between hover:bg-[#313131] active:scale-[0.97] transition-all cursor-default" style={{ height: '34px', paddingLeft: '12px', paddingRight: '12px', borderRadius: '16px' }}>
                <span className="text-[14px] text-[#e3e3e3]">Pool connections</span>
                <div className="flex items-center gap-2">
                  {updating.postgres && <MIcon name="progress_activity" size={14} className="text-[#888] animate-spin" />}
                  <span className="text-[13px] font-mono text-[#aaa] tabular-nums">
                    {s.postgres.pool.totalCount} total · {s.postgres.pool.idleCount} idle · {s.postgres.pool.waitingCount} waiting
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between hover:bg-[#313131] active:scale-[0.97] transition-all cursor-default" style={{ height: '34px', paddingLeft: '12px', paddingRight: '12px', borderRadius: '16px' }}>
                <span className="text-[14px] text-[#e3e3e3]">Row counts</span>
                <div className="flex items-center gap-2">
                  {updating.postgres && <MIcon name="progress_activity" size={14} className="text-[#888] animate-spin" />}
                  <span className="text-[13px] font-mono text-[#aaa] tabular-nums">
                    {s.postgres.counts.users} users · {s.postgres.counts.files} files · {s.postgres.counts.cdnAssets} cdn
                  </span>
                </div>
              </div>
            </SectionCard>

            {/* R2 Storage */}
            <SectionCard icon="cloud" title="Cloudflare R2" badge="S3" delay={0.15}>
              <MetricRow label="HEAD (Network Latency)" value={s.r2.headMs} good={150} warn={400} isLoading={updating.r2} />
              <p className="mt-2 mb-2 px-3 text-[13px] text-[#888] leading-relaxed">
                Measures raw network round-trip time to the Cloudflare storage bucket. Uploads and deletions are intentionally excluded from the automated benchmark to prevent exhausting Class A billing limits.
              </p>
            </SectionCard>

            {/* Authentication */}
            <SectionCard icon="lock" title="Authentication" badge="PBKDF2" delay={0.2}>
              <MetricRow label="PBKDF2 hash (100k iter)" value={s.auth.pbkdf2HashMs} good={100} warn={300} isLoading={updating.auth} />
              <MetricRow label="PBKDF2 verify" value={s.auth.pbkdf2VerifyMs} good={100} warn={300} isLoading={updating.auth} />
              <MetricRow label="JWT sign (HMAC-SHA256)" value={s.auth.jwtSignMs} good={1} warn={5} isLoading={updating.auth} />
              <MetricRow label="JWT verify" value={s.auth.jwtVerifyMs} good={1} warn={5} isLoading={updating.auth} />
            </SectionCard>

            {/* Cryptography */}
            <SectionCard icon="shield" title="Cryptography" badge="AES-256-GCM" delay={0.25}>
              <MetricRow label="AES-256-GCM encrypt" value={s.crypto.aesEncryptMs} good={1} warn={5} isLoading={updating.crypto} />
              <MetricRow label="AES-256-GCM decrypt" value={s.crypto.aesDecryptMs} good={1} warn={5} isLoading={updating.crypto} />
              <MetricRow label="SHA-256 (1MB)" value={s.crypto.sha256Ms} good={5} warn={20} isLoading={updating.crypto} />
              <MetricRow label="HMAC-SHA256 (4KB)" value={s.crypto.hmacMs} good={1} warn={5} isLoading={updating.crypto} />
              <MetricRow label="CSPRNG (1KB)" value={s.crypto.csprngMs} good={1} warn={5} isLoading={updating.crypto} />
              <div className="flex items-center justify-between hover:bg-[#313131] active:scale-[0.97] transition-all cursor-default" style={{ height: '34px', paddingLeft: '12px', paddingRight: '12px', borderRadius: '16px' }}>
                <span className="text-[14px] text-[#e3e3e3]">SHA-256 throughput</span>
                <div className="flex items-center gap-2">
                  {updating.crypto && <MIcon name="progress_activity" size={14} className="text-[#888] animate-spin" />}
                  <span className="text-[13px] font-mono font-semibold text-emerald-400 tabular-nums">
                    {s.crypto.sha256ThroughputMBps.toFixed(0)} MB/s
                  </span>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* System info bar */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className={`mt-5 rounded-[20px] p-6 relative`}
            style={{ backgroundColor: '#1f1f1f' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <MIcon name="dns" size={16} className="text-[#555]" />
              <h3 className="text-[12px] font-semibold text-[#555] uppercase tracking-wider flex items-center gap-2">
                Runtime
                {updating.system && <MIcon name="progress_activity" size={12} className="text-[#888] animate-spin" />}
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
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
                  <p className="text-[10px] text-[#555] font-semibold uppercase tracking-wider mb-0.5">{item.label}</p>
                  <p className="text-[13px] font-mono text-[#ccc] tabular-nums">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Footer note */}
          <p className="text-center text-[12px] text-[#444] mt-8">
            Benchmarks run server-side every 3s. Data streamed via SSE.
          </p>
        </div>
      )}
    </main>
  )
}
