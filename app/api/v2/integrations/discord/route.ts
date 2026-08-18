import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { apiError } from "@/lib/http/apiError"
import { isValidDiscordWebhook } from "@/lib/integrations/discordWebhook"
import { API_ERRORS, DISCORD_MAX_CONTENT_LENGTH } from "@/constants"

export const dynamic = "force-dynamic"

// Relays to Discord since browsers can't POST webhooks directly (no CORS).
// SSRF-guarded: only well-formed Discord webhook URLs fetched, redirects refused.
export const POST = withAuth(async ({ request }) => {
  const body = await request.json().catch(() => ({}))
  const { url, content } = body

  if (typeof url !== "string" || !isValidDiscordWebhook(url)) {
    return apiError(400, API_ERRORS.BAD_REQUEST, "Invalid webhook URL")
  }
  if (typeof content !== "string" || content.length === 0 || content.length > DISCORD_MAX_CONTENT_LENGTH) {
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
