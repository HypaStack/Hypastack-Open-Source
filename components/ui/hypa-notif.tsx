"use client"
import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "./material-icon"
import { TextInput } from "./text-input"
import { ShineButton } from "./shine-button"
import { SecondaryButton } from "./secondary-button"
import { ProgressBar } from "./progress-bar"
import { AlertMessage } from "./alert-message"
import { Loader } from "./loader"

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
  /** Warning shown above the actions. Defaults to a permanent-delete note when destructive. */
  alertText?: string
  /** Async action run inside the dialog on confirm: the button shows a spinner,
   *  then the dialog closes. Errors show inline. */
  onConfirm?: () => Promise<void>
  /** Button label while onConfirm runs. Defaults to confirmText. */
  loadingText?: string
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

const hypaUpdate = (id: string, options: Partial<HypaNotifOptions> & { _close?: boolean }) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hypa-update", { detail: { id, ...options } }))
  }
}

// Fire-and-forget toast: a single-button notification that also auto-dismisses.
// Use for non-blocking status/error feedback instead of the native alert().
export const hypaToast = (options: HypaNotifOptions & { durationMs?: number }) => {
  const id = Math.random().toString(36).slice(2, 9)
  if (typeof window !== "undefined") {
    const { durationMs, ...rest } = options
    window.dispatchEvent(new CustomEvent("hypa-confirm", {
      detail: { confirmOnly: true, confirmText: "Dismiss", confirmIcon: "close", ...rest, id, resolve: () => {} }
    }))
    const d = durationMs ?? 5000
    if (d > 0) window.setTimeout(() => hypaUpdate(id, { _close: true }), d)
  }
  return { id, close: () => hypaUpdate(id, { _close: true }) }
}

/** Convenience error toast — the title carries the message, description is optional detail. */
export const hypaError = (message: string, description?: string) =>
  hypaToast({ title: message, description })

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
      <div style={{ padding: '8px 8px 2px' }}>
        <p className="text-[#111] dark:text-[#f7f8f8]" style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', paddingLeft: 2, paddingBottom: 8 }}>
          {notif.title}
        </p>
        <TextInput
          ref={inputRef}
          type="text"
          size="md"
          fullWidth
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); if (e.key === "Escape") handleCancel() }}
          placeholder={notif.inputPlaceholder ?? ""}
        />
      </div>
      <div className="flex gap-2 mt-1.5">
        <div className="flex-1">
          <SecondaryButton size="md" fullWidth onClick={handleCancel}>
            {notif.cancelText ?? "Cancel"}
          </SecondaryButton>
        </div>
        <div className="flex-1">
          <ShineButton size="md" fullWidth onClick={handleConfirm} disabled={!value.trim()}>
            {notif.confirmText ?? "Create"}
          </ShineButton>
        </div>
      </div>
    </>
  )
}

/** Treat delete/wipe-style confirmations as destructive even if the caller
 *  didn't set the flag, so they get the red button + permanent-delete warning. */
function isDestructiveNotif(n: NotifState): boolean {
  if (n.destructive) return true
  const t = `${n.confirmText ?? ""} ${n.title ?? ""}`.toLowerCase()
  return /\b(wipe|delete|remove|erase|destroy)\b/.test(t) || t.includes("forever")
}

function ConfirmNotif({ notif, destructive, onResolve }: { notif: NotifState; destructive: boolean; onResolve: (id: string, value: boolean) => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    if (!notif.onConfirm) { onResolve(notif.id, true); return }
    setLoading(true)
    setError(null)
    try {
      await notif.onConfirm()
      onResolve(notif.id, true) // just close, no success popup
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
      setLoading(false)
    }
  }

  const warning = error ?? notif.alertText ?? (destructive ? "This permanently deletes it and can't be recovered." : null)

  return (
    <>
      {warning && (
        <div style={{ padding: '0 6px 6px' }}>
          <AlertMessage tone="error" style={{ marginBottom: 0 }}>{warning}</AlertMessage>
        </div>
      )}
      <div className="flex gap-2" style={{ padding: 4 }}>
        <div className="flex-1">
          <SecondaryButton size="md" fullWidth disabled={loading} onClick={() => onResolve(notif.id, false)}>
            {notif.cancelText || "Cancel"}
          </SecondaryButton>
        </div>
        <div className="flex-1">
          <ShineButton
            size="md"
            fullWidth
            disabled={loading}
            onClick={confirm}
            color={destructive ? "#dc2626" : undefined}
            hoverColor={destructive ? "#b91c1c" : undefined}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader size={16} color="#ffffff" />
                {notif.loadingText ?? notif.confirmText ?? "Confirm"}
              </span>
            ) : (notif.confirmText || "Confirm")}
          </ShineButton>
        </div>
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
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-sm:bottom-4 max-sm:left-4 max-sm:right-4">
      <AnimatePresence>
        {notifs.map((notif) => {
          const destructive = isDestructiveNotif(notif)
          return (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          className="w-full sm:w-[360px] pointer-events-auto overflow-hidden bg-white/95 dark:bg-[rgba(14,15,16,0.92)] backdrop-blur-xl border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] rounded-[16px]"
            style={{
              boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)',
              padding: 6,
            }}
          >
            {/* Title + description */}
            {!notif.isInput && (
              <div style={{ padding: '10px 14px 6px 14px' }}>
                <p className="text-[#111] dark:text-[#f0f0f0]" style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: notif.description ? 3 : 0 }}>
                  {notif.title}
                </p>
                {notif.description && (
                  <p className="text-[#666] dark:text-[#898e97]" style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.4 }}>
                    {notif.description}
                  </p>
                )}
              </div>
            )}

            {/* File list */}
            {notif.items && notif.items.length > 0 && (
              <div
                className="bg-[#f4f4f5] dark:bg-[rgba(0,0,0,0.22)] rounded-[10px] border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.08)]"
                style={{ margin: '0 6px 6px', padding: 4, maxHeight: 140, overflowY: 'auto' }}
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
              <div style={{ padding: '6px 8px 8px' }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[#666] dark:text-[#898e97]" style={{ fontSize: 13 }}>{notif.progressText || "Processing..."}</span>
                  <span className="text-[#111] dark:text-[#f0f0f0]" style={{ fontSize: 13, fontWeight: 500 }}>{Math.round(notif.progressPercent || 0)}%</span>
                </div>
                <ProgressBar value={notif.progressPercent || 0} height={5} aria-label={notif.progressText || "Progress"} />
              </div>
            ) : notif.isInput ? (
              <InputNotif notif={notif} onResolve={handleResolve} />
            ) : notif.confirmOnly ? (
              <div style={{ padding: 4 }}>
                <SecondaryButton size="md" fullWidth onClick={() => handleResolve(notif.id, true)}>
                  {notif.confirmText || "Dismiss"}
                </SecondaryButton>
              </div>
            ) : (
              <ConfirmNotif notif={notif} destructive={destructive} onResolve={handleResolve} />
            )}
          </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
