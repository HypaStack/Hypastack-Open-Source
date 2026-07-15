"use client"

import { useEffect, useState } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { ShineButton } from "@/components/ui/shine-button"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { TextInput } from "@/components/ui/text-input"
import { Loader } from "@/components/ui/loader"
import { AlertMessage } from "@/components/ui/alert-message"
import { ToggleSwitch } from "@/components/ui/toggle-switch"
import { getWebhookConfig, setWebhookConfig, getWebhookLog, clearWebhookLog, sendTest, isValidDiscordWebhook, type WebhookLogEntry } from "@/lib/integrations/discordWebhook"
import { WEBHOOK_LOG_EVENT } from "@/constants"

export function IntegrationsTab() {
  const [url, setUrl] = useState("")
  const [enabled, setEnabled] = useState(false)
  const [log, setLog] = useState<WebhookLogEntry[]>([])
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    const cfg = getWebhookConfig()
    setUrl(cfg.url)
    setEnabled(cfg.enabled)
    setLog(getWebhookLog())
    const refresh = () => setLog(getWebhookLog())
    window.addEventListener(WEBHOOK_LOG_EVENT, refresh)
    return () => window.removeEventListener(WEBHOOK_LOG_EVENT, refresh)
  }, [])

  const trimmed = url.trim()
  const urlValid = trimmed === "" || isValidDiscordWebhook(trimmed)
  const testable = isValidDiscordWebhook(trimmed)

  const handleSave = () => {
    if (!urlValid) return
    const on = enabled && !!trimmed
    setWebhookConfig({ url: trimmed, enabled: on })
    if (!trimmed) setEnabled(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleToggle = (v: boolean) => {
    setEnabled(v)
    setWebhookConfig({ url: trimmed, enabled: v && !!trimmed })
  }

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

  const handleClear = () => {
    clearWebhookLog()
    setLog([])
  }

  const card = "bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]"

  return (
    <div className="space-y-4">
      <div className={card} style={{ borderRadius: 12, padding: '14px 16px' }}>
        <div className="flex items-center gap-2 mb-1">
          <MIcon name="webhook" size={16} className="text-[#666] dark:text-[#898e97]" />
          <p className="text-[13px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0]">Discord webhook</p>
        </div>
        <p className="text-[13px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] leading-relaxed">
          Get a ping in a Discord channel every time you upload. The link is sent without its decryption key, so it's just a heads-up, not access. Runs from this browser only.
        </p>
      </div>

      <div className={`${card} flex flex-col`} style={{ borderRadius: 12, padding: '16px 20px', gap: 16 }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0]">Enable webhook</p>
            <p className="text-[12px] text-[#666] dark:text-[#898e97] mt-0.5">Send an upload notification to your channel.</p>
          </div>
          <ToggleSwitch checked={enabled} onChange={handleToggle} aria-label="Enable Discord webhook" />
        </div>

        <div>
          <label className="block text-[12px] font-medium text-[#888] dark:text-[#898e97] mb-1.5">Webhook URL</label>
          <TextInput
            type="text"
            size="md"
            fullWidth
            value={url}
            onChange={(e) => { setUrl(e.target.value); setTestResult(null) }}
            placeholder="https://discord.com/api/webhooks/..."
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            style={{ height: 40, fontWeight: 500 }}
          />
        </div>

        {!urlValid && (
          <AlertMessage tone="error" style={{ marginBottom: 0 }}>That doesn't look like a Discord webhook URL.</AlertMessage>
        )}
        {testResult && (
          <AlertMessage tone={testResult.ok ? "success" : "error"} style={{ marginBottom: 0 }}>{testResult.msg}</AlertMessage>
        )}

        <div className="flex items-center gap-2">
          <ShineButton
            size="sm"
            onClick={handleSave}
            disabled={!urlValid}
            color={saved ? "#16a34a" : undefined}
            hoverColor={saved ? "#15803d" : undefined}
          >
            {saved ? "Saved" : "Save"}
          </ShineButton>
          <SecondaryButton size="sm" onClick={handleTest} disabled={!testable || testing}>
            {testing ? (
              <span className="flex items-center gap-2"><Loader size={14} /> Testing…</span>
            ) : "Send test"}
          </SecondaryButton>
        </div>
      </div>

      <div className={card} style={{ borderRadius: 12, padding: '16px 20px' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[14px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0]">Recent activity</p>
          {log.length > 0 && (
            <SecondaryButton size="xs" onClick={handleClear}>Clear</SecondaryButton>
          )}
        </div>
        {log.length === 0 ? (
          <p className="text-[12px] text-[#888] dark:text-[#898e97]">No webhook activity yet. Uploads will show up here.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {log.map((e, i) => (
              <AlertMessage
                key={`${e.ts}-${i}`}
                tone={e.ok ? "success" : "error"}
                animate={false}
                icon={<MIcon name={e.ok ? "check_circle" : "error"} size={16} style={{ flexShrink: 0, marginRight: 8, marginTop: 1 }} />}
                style={{ marginBottom: 0 }}
              >
                <span className="flex flex-col">
                  <span>{e.ok ? "Sent to Discord" : `Failed${e.error ? ` — ${e.error}` : ""}`}</span>
                  <span className="text-[11px] opacity-70 break-all">{e.link} · {new Date(e.ts).toLocaleTimeString()}</span>
                </span>
              </AlertMessage>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
