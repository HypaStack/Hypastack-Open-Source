"use client"
import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "./material-icon"

export interface HypaNotifOptions {
  title: string
  description?: string
  items?: string[]
  confirmText?: string
  confirmIcon?: string
  cancelText?: string
  destructive?: boolean
  isProgress?: boolean
  progressText?: string
  progressPercent?: number
  isInput?: boolean
  inputPlaceholder?: string
  inputDefaultValue?: string
  /** When true, only the confirm button is shown (no cancel). Use for info/success notifications. */
  confirmOnly?: boolean
}

type PromiseResolvers = {
  resolve: (value: boolean | string | null) => void
}

type NotifState = HypaNotifOptions & PromiseResolvers & { id: string }

declare global {
  interface Window {
    __hypaNotifListener: ((notif: NotifState) => void) | null
  }
}

export const hypaConfirm = (options: HypaNotifOptions): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined") {
      const event = new CustomEvent("hypa-confirm", {
        detail: { ...options, id: Math.random().toString(36).slice(2, 9), resolve }
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
        detail: { ...options, isInput: true, id: Math.random().toString(36).slice(2, 9), resolve }
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
      detail: { ...options, isProgress: true, id, resolve: () => {} }
    })
    window.dispatchEvent(event)
  }
  return {
    id,
    update: (opts: Partial<HypaNotifOptions>) => hypaUpdate(id, opts),
    close: () => hypaUpdate(id, { _close: true }),
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
      <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-transparent mb-1" style={{ borderRadius: 6, padding: 10 }}>
        <p className="text-[#111] dark:text-[#f0f0f0]" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', paddingLeft: 2, paddingBottom: 8 }}>
          {notif.title}
        </p>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); if (e.key === "Escape") handleCancel() }}
          placeholder={notif.inputPlaceholder ?? ""}
          className="w-full focus:outline-none bg-[#ffffff] dark:bg-[#111] border border-[#e5e5e5] dark:border-transparent text-[#111] dark:text-[#f0f0f0]"
          style={{ height: 34, paddingLeft: 10, paddingRight: 10, borderRadius: 6, fontSize: 13 }}
        />
      </div>
      <div className="flex gap-1">
        <button
          onClick={handleCancel}
          className="flex-1 flex items-center justify-center hover:bg-[#f5f5f5] dark:hover:bg-[#222] active:scale-[0.97] transition-all duration-75 text-[#888] dark:text-[#a1a1aa]"
          style={{ height: 36, borderRadius: 6, fontSize: 13, fontWeight: 400 }}
        >
          {notif.cancelText ?? "Cancel"}
        </button>
        <button
          onClick={handleConfirm}
          disabled={!value.trim()}
          className="flex-1 flex items-center justify-center hover:bg-[#f0f0f0] dark:hover:bg-[#222] active:scale-[0.97] transition-all duration-75 disabled:opacity-40 disabled:cursor-not-allowed text-[#111] dark:text-[#f0f0f0]"
          style={{ height: 36, borderRadius: 6, fontSize: 13, fontWeight: 600 }}
        >
          {notif.confirmText ?? "Create"}
        </button>
      </div>
    </>
  )
}

/** Maps common confirmText values to a fitting Material icon name */
function inferConfirmIcon(confirmText?: string, destructive?: boolean): string {
  if (destructive) return "delete_forever"
  const t = (confirmText ?? "").toLowerCase()
  if (t.includes("wipe") || t.includes("delete") || t.includes("remove")) return "delete_forever"
  if (t.includes("swap") || t.includes("replace")) return "swap_horiz"
  if (t.includes("create") || t.includes("add") || t.includes("new")) return "add"
  if (t.includes("save") || t.includes("update")) return "save"
  if (t.includes("move")) return "drive_file_move"
  if (t.includes("close") || t.includes("dismiss")) return "check"
  if (t.includes("confirm") || t.includes("yes")) return "check"
  if (t.includes("download")) return "download"
  if (t.includes("upload")) return "upload"
  if (t.includes("copy")) return "content_copy"
  if (t.includes("rename")) return "edit"
  if (t.includes("restore")) return "restore"
  return "check"
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
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-sm:bottom-4 max-sm:left-4 max-sm:right-4">
      <AnimatePresence>
        {notifs.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            className="w-full sm:w-[380px] pointer-events-auto overflow-hidden bg-[#ffffff] dark:bg-[#1c1c1c]"
            style={{
              borderRadius: 6,
              boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.10)',
              padding: 4,
            }}
          >
            {/* Title + description */}
            {!notif.isInput && (
              <div style={{ padding: '12px 12px 8px 12px' }}>
                <p className="text-[#111] dark:text-[#f0f0f0]" style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: notif.description ? 3 : 0 }}>
                  {notif.title}
                </p>
                {notif.description && (
                  <p className="text-[#888] dark:text-[#a1a1aa]" style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.4 }}>
                    {notif.description}
                  </p>
                )}
              </div>
            )}

            {/* File list */}
            {notif.items && notif.items.length > 0 && (
              <div
                className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-transparent [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                style={{ borderRadius: 6, margin: '0 0 4px 0', padding: 4, maxHeight: 140, overflowY: 'auto' }}
              >
                {notif.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5" style={{ height: 32, paddingLeft: 10, paddingRight: 10, borderRadius: 6 }}>
                    <MIcon name="description" size={14} className="text-[#999] dark:text-[#a1a1aa]" style={{ flexShrink: 0 }} />
                    <span className="text-[#333] dark:text-[#ccc]" style={{ fontSize: 13, fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions or Progress */}
            {notif.isProgress ? (
              <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-transparent" style={{ borderRadius: 6, padding: '12px 14px' }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[#888] dark:text-[#a1a1aa]" style={{ fontSize: 13 }}>{notif.progressText || "Processing..."}</span>
                  <span className="text-[#111] dark:text-[#f0f0f0]" style={{ fontSize: 13, fontWeight: 500 }}>{Math.round(notif.progressPercent || 0)}%</span>
                </div>
                <div className="bg-[#e5e5e5] dark:bg-[#333]" style={{ height: 5, borderRadius: 3, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${notif.progressPercent || 0}%` }}
                    transition={{ ease: "linear", duration: 0.2 }}
                    className="bg-[#171717] dark:bg-[#e3e3e3]"
                    style={{ height: '100%', borderRadius: 3 }}
                  />
                </div>
              </div>
            ) : notif.isInput ? (
              <InputNotif notif={notif} onResolve={handleResolve} />
            ) : (
              <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-transparent" style={{ borderRadius: 6, padding: 4 }}>
                <button
                  onClick={() => handleResolve(notif.id, true)}
                  className={`w-full flex items-center gap-3 hover:bg-[#ebebeb] dark:hover:bg-[#2a2a2a] active:scale-[0.97] transition-all duration-75 ${notif.destructive ? 'text-[#ef4444]' : 'text-[#111] dark:text-[#f0f0f0]'}`}
                  style={{ height: 36, paddingLeft: 12, paddingRight: 12, borderRadius: 6, fontSize: 14, fontWeight: 400 }}
                >
                  <MIcon
                    name={notif.confirmIcon ?? inferConfirmIcon(notif.confirmText, notif.destructive)}
                    size={15}
                    style={{ color: notif.destructive ? '#ef4444' : undefined }}
                    className={notif.destructive ? '' : 'text-[#999] dark:text-[#a1a1aa]'}
                  />
                  {notif.confirmText || "Confirm"}
                </button>
                {!notif.confirmOnly && (
                  <button
                    onClick={() => handleResolve(notif.id, false)}
                    className="w-full flex items-center gap-3 hover:bg-[#ebebeb] dark:hover:bg-[#2a2a2a] active:scale-[0.97] transition-all duration-75 text-[#333] dark:text-[#ccc]"
                    style={{ height: 36, paddingLeft: 12, paddingRight: 12, borderRadius: 6, fontSize: 14, fontWeight: 400 }}
                  >
                    <MIcon name="close" size={15} className="text-[#999] dark:text-[#a1a1aa]" />
                    {notif.cancelText || "Cancel"}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
