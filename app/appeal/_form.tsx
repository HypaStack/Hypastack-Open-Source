"use client"

import { useState } from "react"
import Turnstile from "react-turnstile"
import { Button, Card, Input, Label, TextArea, TextField, Typography } from "@heroui/react"
import { AlertMessage } from "@/components/ui/alert-message"
import { apiFetch } from "@/lib/http/fetch"
import { errorMessage } from "@/lib/errors"
import { MAX_APPEAL_LENGTH } from "@/constants"

export function AppealForm() {
  const [userId, setUserId] = useState("")
  const [message, setMessage] = useState("")
  const [turnstileToken, setTurnstileToken] = useState(process.env.NODE_ENV === "development" ? "dev-bypass" : "")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const ready = userId.trim() && message.trim() && (turnstileToken || process.env.NODE_ENV === "development")

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSending(true)
    try {
      const res = await apiFetch("/api/v2/appeal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.trim(), message: message.trim(), turnstileToken }),
      })
      if (res.status === 429) throw new Error("You've already sent an appeal recently. Give it an hour.")
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Couldn't submit your appeal")
      setSent(true)
    } catch (err) {
      setError(errorMessage(err))
      setTurnstileToken("")
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <AlertMessage tone="success" style={{ marginBottom: 0 }}>
        Appeal received. If it checks out the block gets lifted, and you'll be able to sign in again.
        There's no reply to wait for here.
      </AlertMessage>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <TextField value={userId} onChange={setUserId} isRequired maxLength={64} className="w-full">
        <Label>Account id</Label>
        <Input placeholder="the id from your account settings" spellCheck={false} autoComplete="off" />
      </TextField>

      <TextField value={message} onChange={setMessage} isRequired maxLength={MAX_APPEAL_LENGTH} className="w-full">
        <Label>What happened?</Label>
        <TextArea rows={6} className="resize-none" placeholder="Anything that helps work out what went wrong." />
      </TextField>

      {error && <AlertMessage tone="error" style={{ marginBottom: 0 }}>{error}</AlertMessage>}

      {process.env.NODE_ENV !== "development" && (
        <div className="flex justify-center">
          <Turnstile
            sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
            onVerify={(t) => setTurnstileToken(t)}
            onExpire={() => setTurnstileToken("")}
          />
        </div>
      )}

      <Button type="submit" variant="primary" size="md" fullWidth isDisabled={!ready || sending}>
        {sending ? "Sending..." : "Submit appeal"}
      </Button>
    </form>
  )
}

export function AppealCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="w-full max-w-[440px]">
      <Card.Header>
        <Typography type="h4" className="text-foreground">Appeal a block</Typography>
      </Card.Header>
      <Card.Content>{children}</Card.Content>
    </Card>
  )
}
