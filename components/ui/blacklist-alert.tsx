"use client"

import { AlertMessage } from "@/components/ui/alert-message"

export function BlacklistAlert() {
  return (
    <AlertMessage tone="error" style={{ marginBottom: 0 }}>
      Your accounts are suspended and you&apos;ve been blacklisted. Submit an appeal{" "}
      <a href="/appeal" className="underline hover:opacity-70 transition-opacity">
        here
      </a>
      .
    </AlertMessage>
  )
}
