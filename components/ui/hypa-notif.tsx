"use client"
import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "./material-icon"

export interface HypaNotifOptions {
  title: string
  description?: string
  items?: string[]
  confirmText?: string
  cancelText?: string
  destructive?: boolean
  isProgress?: boolean
  progressText?: string
  progressPercent?: number
  isInput?: boolean
  inputPlaceholder?: string
  inputDefaultValue?: string
}

type PromiseResolvers = {
  resolve: (value: boolean | string | null) => void
}

type NotifState = HypaNotifOptions & PromiseResolvers & { id: string }

// Use globalThis so the listener survives Next.js module re-evaluations
// when navigating between pages (avoids the singleton being wiped).
declare global {
  interface Window {
    __hypaNotifListener: ((notif: NotifState) => void) | null
  }
}

export const hypaConfirm = (options: HypaNotifOptions): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined") {
      const event = new CustomEvent("hypa-confirm", {
        detail: {
          ...options,
          id: Math.random().toString(36).slice(2, 9),
          resolve,
        }
      })
      window.dispatchEvent(event)
    } else {
      resolve(false)
    }
  })
}

export const hypaPrompt = (options: HypaNotifOptions): Promise<string | null> => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined") {
      const event = new CustomEvent("hypa-confirm", {
        detail: {
          ...options,
          isInput: true,
          id: Math.random().toString(36).slice(2, 9),
          resolve,
        }
      })
      window.dispatchEvent(event)
    } else {
      resolve(null)
    }
  })
}

export const hypaUpdate = (id: string, options: Partial<HypaNotifOptions> & { _close?: boolean }) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hypa-update", { detail: { id, ...options } }))
  }
}

export const hypaProgress = (options: HypaNotifOptions) => {
  const id = Math.random().toString(36).slice(2, 9)
  if (typeof window !== "undefined") {
    const event = new CustomEvent("hypa-confirm", {
      detail: {
        ...options,
        isProgress: true,
        id,
        resolve: () => {}, // empty
      }
    })
    window.dispatchEvent(event)
  }
  
  return {
    id,
    update: (opts: Partial<HypaNotifOptions>) => hypaUpdate(id, opts),
    close: () => hypaUpdate(id, { _close: true })
  }
}

function InputNotif({ notif, onResolve }: { notif: NotifState; onResolve: (id: string, value: string | null) => void }) {
  const [value, setValue] = React.useState(notif.inputDefaultValue ?? "")
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [])

  const handleConfirm = () => {
    if (!value.trim()) return
    onResolve(notif.id, value.trim())
  }

  const handleCancel = () => onResolve(notif.id, null)

  return (
    <>
      {/* Input inside the inner card */}
      <div style={{ backgroundColor: '#1f1f1f', borderRadius: 16, padding: 8, marginBottom: 4 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#ffffff', letterSpacing: '-0.01em', paddingLeft: 2, paddingBottom: 6 }}>{notif.title}</p>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); if (e.key === "Escape") handleCancel() }}
          placeholder={notif.inputPlaceholder ?? ""}
          className="w-full focus:outline-none"
          style={{ height: 32, paddingLeft: 10, paddingRight: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#111', fontSize: 13, color: '#e3e3e3' }}
        />
      </div>
      {/* Buttons outside the inner card */}
      <div className="flex gap-1">
        <button
          onClick={handleCancel}
          className="flex-1 flex items-center justify-center hover:bg-[#222] active:scale-[0.97] transition-all duration-75"
          style={{ height: 34, borderRadius: 12, fontSize: 13, fontWeight: 400, color: '#a1a1aa' }}
        >
          {notif.cancelText ?? "Cancel"}
        </button>
        <button
          onClick={handleConfirm}
          disabled={!value.trim()}
          className="flex-1 flex items-center justify-center hover:bg-[#222] active:scale-[0.97] transition-all duration-75 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ height: 34, borderRadius: 12, fontSize: 13, fontWeight: 500, color: '#ffffff' }}
        >
          {notif.confirmText ?? "Create"}
        </button>
      </div>
    </>
  )
}

export function HypaNotifProvider() {
  const [notifs, setNotifs] = useState<NotifState[]>([])

  useEffect(() => {
    const handleConfirm = (e: Event) => {
      const event = e as CustomEvent<NotifState>
      setNotifs((prev) => [...prev, event.detail])
    }
    const handleUpdate = (e: Event) => {
      const event = e as CustomEvent<any>
      if (event.detail._close) {
        setNotifs((prev) => prev.filter(n => n.id !== event.detail.id))
      } else {
        setNotifs((prev) => prev.map(n => n.id === event.detail.id ? { ...n, ...event.detail } : n))
      }
    }
    
    if (typeof window !== "undefined") {
      window.addEventListener("hypa-confirm", handleConfirm)
      window.addEventListener("hypa-update", handleUpdate)
      return () => {
        window.removeEventListener("hypa-confirm", handleConfirm)
        window.removeEventListener("hypa-update", handleUpdate)
      }
    }
  }, [])

  const handleResolve = (id: string, value: boolean | string | null) => {
    setNotifs((prev) => {
      const notif = prev.find((n) => n.id === id)
      if (notif) notif.resolve(value)
      return prev.filter((n) => n.id !== id)
    })
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {notifs.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            className="w-[400px] pointer-events-auto overflow-hidden"
            style={{
              backgroundColor: '#171717',
              borderRadius: 20,
              boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 2px 6px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.22)',
              padding: 4,
            }}
          >
            {/* Title + description — hidden for input prompts */}
            {!notif.isInput && (
              <div style={{ padding: '14px 14px 10px 14px' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#ffffff', letterSpacing: '-0.01em', marginBottom: notif.description ? 4 : 0 }}>
                  {notif.title}
                </p>
                {notif.description && (
                  <p style={{ fontSize: 13, fontWeight: 400, color: '#a1a1aa', lineHeight: 1.4 }}>
                    {notif.description}
                  </p>
                )}
              </div>
            )}

            {/* File list */}
            {notif.items && notif.items.length > 0 && (
              <div
                style={{ backgroundColor: '#1f1f1f', borderRadius: 16, margin: '0 0 4px 0', padding: 4, maxHeight: 140, overflowY: 'auto' }}
                className="[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                {notif.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5" style={{ height: 32, paddingLeft: 10, paddingRight: 10, borderRadius: 12 }}>
                    <MIcon name="description" size={14} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 400, color: '#e3e3e3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions or Progress */}
            {notif.isProgress ? (
              <div style={{ backgroundColor: '#1f1f1f', borderRadius: 16, padding: '12px 14px' }}>
                <div className="flex justify-between items-center mb-2">
                  <span style={{ fontSize: 13, color: '#a1a1aa' }}>{notif.progressText || "Processing..."}</span>
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{Math.round(notif.progressPercent || 0)}%</span>
                </div>
                <div style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${notif.progressPercent || 0}%` }}
                    transition={{ ease: "linear", duration: 0.2 }}
                    style={{ height: '100%', backgroundColor: '#fff', borderRadius: 3 }}
                  />
                </div>
              </div>
            ) : notif.isInput ? (
              <InputNotif notif={notif} onResolve={handleResolve} />
            ) : (
              <div style={{ backgroundColor: '#1f1f1f', borderRadius: 16, padding: 4 }}>
                <button
                  onClick={() => handleResolve(notif.id, true)}
                  className="w-full flex items-center gap-3 hover:bg-[#282828] active:scale-[0.97] transition-all duration-75"
                  style={{ height: 36, paddingLeft: 12, paddingRight: 12, borderRadius: 12, fontSize: 14, fontWeight: 400, color: '#e15252' }}
                >
                  <MIcon name="delete_forever" size={15} style={{ color: '#e15252' }} />
                  {notif.confirmText || "Confirm"}
                </button>
                <button
                  onClick={() => handleResolve(notif.id, false)}
                  className="w-full flex items-center gap-3 hover:bg-[#282828] active:scale-[0.97] transition-all duration-75"
                  style={{ height: 36, paddingLeft: 12, paddingRight: 12, borderRadius: 12, fontSize: 14, fontWeight: 400, color: '#e3e3e3' }}
                >
                  <MIcon name="close" size={15} style={{ color: '#a1a1aa' }} />
                  {notif.cancelText || "Cancel"}
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
