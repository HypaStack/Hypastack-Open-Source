"use client"

import { useEffect, useState } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { ToggleSwitch } from "@/components/ui/toggle-switch"
import { getWebhookConfig, setWebhookConfig } from "@/lib/integrations/discordWebhook"
import { WebhookDialog } from "./webhook-dialog"

export function IntegrationsTab() {
  const [url, setUrl] = useState("")
  const [enabled, setEnabled] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const cfg = getWebhookConfig()
    setUrl(cfg.url)
    setEnabled(cfg.enabled)
  }, [])

  // Turning it on always routes through the modal so a valid URL is set first;
  // the toggle only flips on once the modal saves. Turning off disables directly.
  const handleToggle = (v: boolean) => {
    if (v) {
      setModalOpen(true)
    } else {
      setEnabled(false)
      setWebhookConfig({ url, enabled: false })
    }
  }

  const handleModalSave = (newUrl: string) => {
    setUrl(newUrl)
    setEnabled(true)
    setWebhookConfig({ url: newUrl, enabled: true })
    setModalOpen(false)
  }

  const card = "bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]"

  return (
    <div className="space-y-4">
      <div className={card} style={{ borderRadius: 12, padding: '12px 16px' }}>
        <div className="flex items-center gap-2 mb-1">
          <MIcon name="webhook" size={16} className="text-[#666] dark:text-[#898e97]" />
          <p className="text-[13px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0]">Discord webhook</p>
        </div>
        <p className="text-[13px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] leading-relaxed">
          Get a ping in a Discord channel every time you upload. The link is sent without its decryption key, so it&apos;s just a heads-up, not access. Runs from this browser only.
        </p>
      </div>

      <div className={card} style={{ borderRadius: 12, padding: '12px 16px' }}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0]">Enable webhook</p>
            <p className="text-[12px] text-[#666] dark:text-[#898e97] mt-0.5">
              {enabled ? "Sending upload notifications to your channel." : "Send an upload notification to your channel."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {enabled && (
              <SecondaryButton size="sm" onClick={() => setModalOpen(true)}>Edit</SecondaryButton>
            )}
            <ToggleSwitch checked={enabled} onChange={handleToggle} aria-label="Enable Discord webhook" />
          </div>
        </div>
      </div>

      <WebhookDialog
        open={modalOpen}
        initialUrl={url}
        onClose={() => setModalOpen(false)}
        onSave={handleModalSave}
      />
    </div>
  )
}
