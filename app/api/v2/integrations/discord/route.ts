import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { apiError } from "@/lib/http/apiError"
import { isValidDiscordWebhook } from "@/lib/integrations/discordWebhook"
import { API_ERRORS } from "@/constants"

export const dynamic = "force-dynamic"

// Server-side relay to a Discord webhook. Browsers can't POST to Discord
// webhooks directly (no CORS), and the payload is a keyless upload
// notification, so relaying it here is safe. SSRF-guarded: only well-formed
// Discord webhook URLs are ever fetched, and redirects are refused.
export const POST = withAuth(async ({ request }) => {
  const body = await request.json().catch(() => ({}))
  const { url, content } = body

  if (typeof url !== "string" || !isValidDiscordWebhook(url)) {
    return apiError(400, API_ERRORS.BAD_REQUEST, "Invalid webhook URL")
  }
  if (typeof content !== "string" || content.length === 0 || content.length > 2000) {
    return apiError(400, API_ERRORS.BAD_REQUEST, "Invalid content")
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
      redirect: "error",
    })
    return NextResponse.json({ ok: res.ok, status: res.status })
  } catch {
    return NextResponse.json({ ok: false, status: 0 })
  }
}, { rateLimit: true, label: "Discord Webhook Relay" })
