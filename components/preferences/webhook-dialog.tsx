"use client"

import { useEffect, useState } from "react"
import { Button, FieldError, Input, Label, Modal, TextField, toast, typographyVariants } from "@heroui/react"
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

  useEffect(() => {
    if (open) setUrl(initialUrl)
  }, [open, initialUrl])

  const trimmed = url.trim()
  const urlValid = trimmed === "" || isValidDiscordWebhook(trimmed)
  const testable = isValidDiscordWebhook(trimmed)

  const handleTest = () => {
    if (!testable || testing) return
    setTesting(true)
    const sent = sendTest(trimmed)
    toast.promise(sent, {
      loading: "Sending test message…",
      success: "Test message sent — check your Discord channel.",
      error: "Couldn't reach that webhook. Double-check the URL.",
    })
    sent.catch(() => {}).finally(() => setTesting(false))
  }

  const handleSave = () => {
    if (!testable) return
    onSave(trimmed)
  }

  return (
    <Modal isOpen={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <Modal.Backdrop isDismissable variant="blur">
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className={typographyVariants({ type: "h5" }).base()}>Discord webhook</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body>
              <TextField
                value={url}
                onChange={setUrl}
                isInvalid={!urlValid}
                className="w-full"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter" && testable && !testing) handleSave() }}
              >
                <Label>Webhook URL</Label>
                <Input
                  placeholder="https://discord.com/api/webhooks/..."
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <FieldError>That doesn&apos;t look like a Discord webhook URL.</FieldError>
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" isDisabled={!testable || testing} onPress={handleTest}>
                {testing ? "Testing…" : "Test webhook"}
              </Button>
              <Button variant="tertiary" onPress={onClose}>Cancel</Button>
              <Button variant="primary" isDisabled={!testable} onPress={handleSave}>Save</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
