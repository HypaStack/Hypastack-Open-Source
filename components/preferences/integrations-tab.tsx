"use client"

import { useEffect, useState } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { Button, Switch, Typography } from "@heroui/react"
import { getWebhookConfig, setWebhookConfig } from "@/lib/integrations/discordWebhook"
import { WebhookDialog } from "./webhook-dialog"
import { SettingsCard } from "./settings-card"

export function IntegrationsTab() {
  const [url, setUrl] = useState("")
  const [enabled, setEnabled] = useState(false)
  const [includeFilenames, setIncludeFilenames] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const cfg = getWebhookConfig()
    setUrl(cfg.url)
    setEnabled(cfg.enabled)
    setIncludeFilenames(cfg.includeFilenames)
  }, [])

  // Turning it on always routes through the modal so a valid URL is set first;
  // the toggle only flips on once the modal saves. Turning off disables directly.
  const handleToggle = (v: boolean) => {
    if (v) {
      setModalOpen(true)
    } else {
      setEnabled(false)
      setWebhookConfig({ url, enabled: false, includeFilenames })
    }
  }

  const handleModalSave = (newUrl: string) => {
    setUrl(newUrl)
    setEnabled(true)
    setWebhookConfig({ url: newUrl, enabled: true, includeFilenames })
    setModalOpen(false)
  }

  const handleFilenamesToggle = (v: boolean) => {
    setIncludeFilenames(v)
    setWebhookConfig({ url, enabled, includeFilenames: v })
  }

  return (
    <div className="space-y-4">
      <SettingsCard>
        <div className="flex items-center gap-2 mb-1">
          <MIcon name="webhook" size={16} className="text-muted" />
          <Typography type="body" weight="semibold" className="text-foreground">Discord webhook</Typography>
        </div>
        <Typography type="body-sm" color="muted" className="leading-relaxed">
          Get a ping in a Discord channel every time you upload. The link is sent without its decryption key, so it&apos;s just a heads-up, not access. Runs from this browser only.
        </Typography>
      </SettingsCard>

      <SettingsCard>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Typography type="body" weight="semibold" className="text-foreground">Enable webhook</Typography>
            <Typography type="body-sm" color="muted" className="mt-0.5">
              {enabled ? "Sending upload notifications to your channel." : "Send an upload notification to your channel."}
            </Typography>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {enabled && (
              <Button variant="tertiary" size="sm" onPress={() => setModalOpen(true)}>Edit</Button>
            )}
            <Switch isSelected={enabled} onChange={handleToggle} aria-label="Enable Discord webhook">
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Content>
            </Switch>
          </div>
        </div>
      </SettingsCard>

      {enabled && (
        <SettingsCard>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Typography type="body" weight="semibold" className="text-foreground">Include filenames</Typography>
              <Typography type="body-sm" color="muted" className="mt-0.5 leading-relaxed">
                Off by default. Your files are encrypted in the browser and Hypastack never sees their names &mdash; turning this on writes them, in the clear, into your Discord channel and anywhere that channel is backed up. Leave it off and every notification just reads &ldquo;New Hypastack upload&rdquo;.
              </Typography>
            </div>
            <div className="shrink-0">
              <Switch isSelected={includeFilenames} onChange={handleFilenamesToggle} aria-label="Include filenames in Discord notifications">
                <Switch.Content>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Content>
              </Switch>
            </div>
          </div>
        </SettingsCard>
      )}

      <WebhookDialog
        open={modalOpen}
        initialUrl={url}
        onClose={() => setModalOpen(false)}
        onSave={handleModalSave}
      />
    </div>
  )
}
