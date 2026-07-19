"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { ShineButton } from "@/components/ui/shine-button"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { TextInput } from "@/components/ui/text-input"
import { ToggleSwitch } from "@/components/ui/toggle-switch"
import { AlertMessage } from "@/components/ui/alert-message"
import { Loader } from "@/components/ui/loader"
import { apiFetch } from "@/lib/http/fetch"
import { V3_SCOPES, V3_SCOPE_LABELS, type V3Scope } from "@/lib/http/v3/scopes"
import { type CreatedApiKey } from "./api-key-types"

export function CreateKeyDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [scopes, setScopes] = useState<V3Scope[]>(["files.read"])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedApiKey | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setName("")
    setScopes(["files.read"])
    setError(null)
    setCreated(null)
    setCopied(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const toggle = (scope: V3Scope) => {
    setScopes((prev) => prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope])
  }

  const canSave = name.trim().length > 0 && scopes.length > 0 && !saving

  const handleCreate = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const res = await apiFetch("/api/v2/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scopes }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.message || data?.error || "Couldn't create that key.")
        return
      }
      setCreated(data as CreatedApiKey)
      onCreated()
    } catch {
      setError("Couldn't reach the server. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[460px] max-h-[86vh] overflow-y-auto flex flex-col bg-white dark:bg-[#121212] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] rounded-[16px]"
            style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)', padding: 6 }}
          >
            {created ? (
              <div style={{ padding: '10px 4px 4px' }}>
                <p className="text-[#111] dark:text-[#f0f0f0]" style={{ fontSize: 14, fontWeight: 600, paddingLeft: 2, paddingBottom: 8 }}>
                  Copy your key now
                </p>
                <AlertMessage tone="warning">
                  This is the only time you&apos;ll see it. Store it somewhere safe.
                </AlertMessage>
                <div
                  className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.03)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.08)] break-all"
                  style={{ borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}
                >
                  <code className="text-[12px] text-[#111] dark:text-[#f0f0f0]">{created.key}</code>
                </div>
                <div className="flex gap-2" style={{ padding: 2 }}>
                  <div className="flex-1">
                    <SecondaryButton
                      size="md"
                      fullWidth
                      onClick={() => {
                        navigator.clipboard.writeText(created.key)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                    >
                      <MIcon name={copied ? "check" : "content_copy"} size={15} />
                      {copied ? "Copied" : "Copy"}
                    </SecondaryButton>
                  </div>
                  <div className="flex-1">
                    <ShineButton size="md" fullWidth onClick={onClose}>Done</ShineButton>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div style={{ padding: '10px 4px 6px' }}>
                  <p className="text-[#111] dark:text-[#f0f0f0]" style={{ fontSize: 14, fontWeight: 600, paddingLeft: 2, paddingBottom: 8 }}>New API key</p>
                  <TextInput
                    type="text"
                    size="md"
                    fullWidth
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(null) }}
                    placeholder="prod uploader"
                    maxLength={60}
                    autoFocus
                    spellCheck={false}
                    style={{ height: 44, fontWeight: 500, fontSize: 14 }}
                  />
                  <p className="text-[11px] text-[#888] dark:text-[#898e97] mt-1.5 pl-0.5">
                    A name you&apos;ll recognise later.
                  </p>
                </div>

                <div style={{ padding: '0 6px 6px' }}>
                  <p className="text-[12px] font-medium text-[#666] dark:text-[#898e97] mb-1.5">What this key can do</p>
                  <div className="divide-y divide-[#eee] dark:divide-[rgba(255,255,255,0.06)] border-t border-[#eee] dark:border-[rgba(255,255,255,0.06)]">
                    {V3_SCOPES.map((scope) => (
                      <div key={scope} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <code className="text-[12px] font-medium text-[#111] dark:text-[#f0f0f0]">{scope}</code>
                          <p className="text-[11px] text-[#888] dark:text-[#6b7076] mt-0.5">{V3_SCOPE_LABELS[scope]}</p>
                        </div>
                        <ToggleSwitch
                          checked={scopes.includes(scope)}
                          onChange={() => toggle(scope)}
                          width={38}
                          height={22}
                          aria-label={V3_SCOPE_LABELS[scope]}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <div style={{ padding: '0 6px 6px' }}>
                    <AlertMessage tone="error" style={{ marginBottom: 0 }}>{error}</AlertMessage>
                  </div>
                )}

                <div className="flex gap-2" style={{ padding: 4 }}>
                  <div className="flex-1">
                    <SecondaryButton size="md" fullWidth onClick={onClose}>Cancel</SecondaryButton>
                  </div>
                  <div className="flex-1">
                    <ShineButton size="md" fullWidth onClick={handleCreate} disabled={!canSave}>
                      {saving ? <span className="flex items-center justify-center gap-2"><Loader size={16} /> Creating…</span> : "Create key"}
                    </ShineButton>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
