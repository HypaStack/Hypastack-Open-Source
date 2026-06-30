import { NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { API_ERRORS } from "@/constants"
const WEBHOOK_URL = process.env.DISCORD_FEEDBACK_WEBHOOK

export async function POST(req: Request) {
  if (!WEBHOOK_URL) {
      return apiError(503, API_ERRORS.SERVICE_UNAVAILABLE, "Feedback not configured")
  }

  try {
    let body: any
    try {
      body = await req.json()
    } catch {
      return apiError(400, API_ERRORS.BAD_REQUEST, "Invalid JSON body")
    }

    const { message } = body

    if (!message || typeof message !== "string") {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Message is required")
    }

    const trimmed = message.trim()
    if (trimmed.length < 2) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Message too short")
    }
    if (trimmed.length > 1000) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Message too long (max 1000 characters)")
    }

    const payload = {
      embeds: [
        {
          title: "📬 Anonymous Feedback",
          description: trimmed,
          color: 0x1f1f1f,
          footer: { text: "Hypastack · Anonymous Feedback" },
          timestamp: new Date().toISOString(),
        },
      ],
    }

    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
        return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to send feedback")
    }

    return NextResponse.json({ ok: true })
  } catch {
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Internal server error")
  }
}
