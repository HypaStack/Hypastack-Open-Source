"use client"

import { useEffect, useState, useRef } from "react"
import { motion } from "motion/react"
import Link from "next/link"
import { MIcon } from "@/components/ui/material-icon"

interface ServiceStatus {
  id: string
  name: string
  ok: boolean
  latencyMs: number
}

interface HeartbeatSnapshot {
  timestamp: number
  services: ServiceStatus[]
}

interface ServiceHistory {
  id: string
  name: string
  beats: boolean[] // true = up, false = missed/down
  current: boolean
}

const MAX_BEATS = 90
const POLL_MS = 30_000

function UptimePct(beats: boolean[]) {
  if (!beats.length) return 100
  return Math.round((beats.filter(Boolean).length / beats.length) * 10000) / 100
}

function HeartbeatBar({ beats, isUp }: { beats: boolean[]; isUp: boolean }) {
  const total = MAX_BEATS
  const padded = Array(Math.max(0, total - beats.length)).fill(null).concat(beats)

  return (
    <div className="flex items-end gap-[2px] w-full" style={{ height: 28 }}>
      {padded.map((beat, i) => {
        if (beat === null) {
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: 28,
                borderRadius: 3,
                backgroundColor: '#f0f0f0',
              }}
            />
          )
        }
        return (
          <div
            key={i}
            title={beat ? "Operational" : "Incident detected"}
            style={{
              flex: 1,
              height: beat ? 28 : 20,
              borderRadius: 3,
              backgroundColor: beat ? '#22c55e' : '#ef4444',
              opacity: beat ? (i === padded.length - 1 ? 1 : 0.75 + (i / padded.length) * 0.25) : 1,
              transition: 'all 0.2s',
            }}
          />
        )
      })}
    </div>
  )
}

export default function StatusPage() {
  const [history, setHistory] = useState<ServiceHistory[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const poll = async () => {
    try {
      const res = await fetch("/api/v2/status", { cache: "no-store" })
      if (!res.ok) throw new Error()
      const data: HeartbeatSnapshot = await res.json()

      setHistory(prev => {
        const next: ServiceHistory[] = data.services.map(svc => {
          const existing = prev.find(h => h.id === svc.id)
          const beats = existing
            ? [...existing.beats.slice(-(MAX_BEATS - 1)), svc.ok]
            : [svc.ok]
          return { id: svc.id, name: svc.name, beats, current: svc.ok }
        })
        return next
      })

      setLastUpdated(new Date())
      setError(false)
    } catch {
      // Mark all services as missed beat
      setHistory(prev => prev.map(h => ({
        ...h,
        beats: [...h.beats.slice(-(MAX_BEATS - 1)), false],
        current: false,
      })))
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    poll()
    const t = setInterval(poll, POLL_MS)
    return () => clearInterval(t)
  }, [])

  const allUp = !error && history.length > 0 && history.every(h => h.current)
  const anyDown = history.some(h => !h.current)

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#fff', fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>

      {/* Minimal top bar */}
      <div style={{ borderBottom: '1px solid #f0f0f0', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 900, margin: '0 auto' }}>
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-70 transition-opacity">
          <img
            src="https://r2.hypastack.com/cdn/u1y77k752jdm/icon.webp"
            alt="Hypastack"
            style={{ height: 26, width: 26, borderRadius: 7 }}
            draggable={false}
          />
          <span style={{ fontSize: 15, fontWeight: 600, color: '#111', letterSpacing: '-0.01em' }}>Hypastack</span>
        </Link>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#888' }}>Status</span>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>

        {/* Hero */}
        <div style={{ paddingTop: 72, paddingBottom: 56, textAlign: 'center' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg className="animate-spin h-6 w-6 text-[#ccc]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <p style={{ fontSize: 14, color: '#bbb' }}>Checking services…</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              {/* Status icon */}
              <div style={{
                width: 56, height: 56, borderRadius: '50%', margin: '0 auto 20px',
                backgroundColor: anyDown ? '#fef2f2' : '#f0fdf4',
                border: `2px solid ${anyDown ? '#fca5a5' : '#86efac'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MIcon
                  name={anyDown ? "warning" : "check"}
                  size={26}
                  style={{ color: anyDown ? '#ef4444' : '#22c55e' }}
                />
              </div>

              <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', color: '#111', marginBottom: 10 }}>
                {anyDown ? "Service disruption detected" : "All services are online"}
              </h1>

              <p style={{ fontSize: 13, color: '#aaa' }}>
                {lastUpdated
                  ? `Last checked ${lastUpdated.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} at ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : "Checking…"}
              </p>
            </motion.div>
          )}
        </div>

        {/* Service cards */}
        {!loading && history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{
              backgroundColor: '#fff',
              border: '1px solid #e5e5e5',
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
              marginBottom: 40,
            }}
          >
            {/* Card header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>Current status by service</span>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 600,
                color: anyDown ? '#ef4444' : '#22c55e',
                backgroundColor: anyDown ? '#fef2f2' : '#f0fdf4',
                border: `1px solid ${anyDown ? '#fca5a5' : '#bbf7d0'}`,
                padding: '3px 10px', borderRadius: 20,
              }}>
                <span className="relative flex h-1.5 w-1.5">
                  {!anyDown && <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />}
                  <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${anyDown ? 'bg-red-500' : 'bg-emerald-500'}`} />
                </span>
                {anyDown ? "Degraded" : "Operational"}
              </div>
            </div>

            {/* Services list */}
            {history.map((svc, i) => {
              const uptime = UptimePct(svc.beats)
              return (
                <div
                  key={svc.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: i < history.length - 1 ? '1px solid #f5f5f5' : 'none',
                  }}
                >
                  {/* Service name + uptime */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="relative flex h-2 w-2">
                        {svc.current && <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />}
                        <span style={{
                          display: 'inline-flex', width: 8, height: 8, borderRadius: '50%',
                          backgroundColor: svc.current ? '#22c55e' : '#ef4444',
                          position: 'relative',
                        }} />
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{svc.name}</span>
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: uptime >= 99 ? '#22c55e' : uptime >= 95 ? '#f59e0b' : '#ef4444',
                    }}>
                      {uptime.toFixed(uptime === 100 ? 0 : 2)}% uptime
                    </span>
                  </div>

                  {/* Heartbeat bar */}
                  <HeartbeatBar beats={svc.beats} isUp={svc.current} />

                  {/* Timeline labels */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                    <span style={{ fontSize: 11, color: '#ccc' }}>
                      {svc.beats.length >= MAX_BEATS ? `${MAX_BEATS} checks ago` : `${svc.beats.length} check${svc.beats.length !== 1 ? 's' : ''} ago`}
                    </span>
                    <span style={{ fontSize: 11, color: '#ccc' }}>Now</span>
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}

        {/* Footer note */}
        {!loading && (
          <p style={{ textAlign: 'center', fontSize: 11, color: '#ddd', paddingBottom: 48 }}>
            Heartbeat checks every 30 seconds. A missed heartbeat marks the service as down.
          </p>
        )}
      </div>
    </main>
  )
}
