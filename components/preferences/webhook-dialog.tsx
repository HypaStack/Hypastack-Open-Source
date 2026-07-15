"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ShineButton } from "@/components/ui/shine-button"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { TextInput } from "@/components/ui/text-input"
import { Loader } from "@/components/ui/loader"
import { AlertMessage } from "@/components/ui/alert-message"
import { sendTest, isValidDiscordWebhook } from "@/lib/integrations/discordWebhook"

export function WebhookDialog({
  open,
  initialUrl,
  onClose,
  onSave,
}: {
  open: boolean
  initialUrl: string
  onClose: () => void
  onSave: (url: string) => void
}) {
  const [url, setUrl] = useState(initialUrl)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    if (open) {
      setUrl(initialUrl)
      setTestResult(null)
    }
  }, [open, initialUrl])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const trimmed = url.trim()
  const urlValid = trimmed === "" || isValidDiscordWebhook(trimmed)
  const testable = isValidDiscordWebhook(trimmed)

  const handleTest = async () => {
    if (!testable) return
    setTesting(true)
    setTestResult(null)
    try {
      await sendTest(trimmed)
      setTestResult({ ok: true, msg: "Test message sent — check your Discord channel." })
    } catch {
      setTestResult({ ok: false, msg: "Couldn't reach that webhook. Double-check the URL." })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = () => {
    if (!testable) return
    onSave(trimmed)
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
            className="relative w-full max-w-[420px] flex flex-col bg-white dark:bg-[#0e0f10] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] rounded-[16px]"
            style={{
              boxShadow: '0 16px 48px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)',
              padding: 6,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && testable && !testing) handleSave()
            }}
          >
            <div style={{ padding: '10px 4px 6px' }}>
              <p className="text-[#111] dark:text-[#f0f0f0]" style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', paddingLeft: 2, paddingBottom: 8 }}>Discord webhook</p>
              <TextInput
                type="text"
                size="md"
                fullWidth
                value={url}
                onChange={(e) => { setUrl(e.target.value); setTestResult(null) }}
                placeholder="https://discord.com/api/webhooks/..."
                autoFocus
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                style={{ height: 46, fontWeight: 500, fontSize: 14 }}
              />
              {!urlValid && (
                <p className="text-[11px] text-red-500 mt-2">That doesn&apos;t look like a Discord webhook URL.</p>
              )}
            </div>

            {testResult && (
              <div style={{ padding: '0 6px 6px' }}>
                <AlertMessage tone={testResult.ok ? "success" : "error"} style={{ marginBottom: 0 }}>{testResult.msg}</AlertMessage>
              </div>
            )}

            <div style={{ padding: '0 4px 4px' }}>
              <SecondaryButton size="md" fullWidth onClick={handleTest} disabled={!testable || testing}>
                {testing ? (
                  <span className="flex items-center justify-center gap-2"><Loader size={16} /> Testing…</span>
                ) : "Test webhook"}
              </SecondaryButton>
            </div>

            <div className="flex gap-2" style={{ padding: 4 }}>
              <div className="flex-1">
                <SecondaryButton size="md" fullWidth onClick={onClose}>Cancel</SecondaryButton>
              </div>
              <div className="flex-1">
                <ShineButton size="md" fullWidth onClick={handleSave} disabled={!testable}>Save</ShineButton>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
