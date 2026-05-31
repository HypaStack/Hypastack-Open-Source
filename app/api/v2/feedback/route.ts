import { NextResponse } from "next/server"

const WEBHOOK_URL = process.env.DISCORD_FEEDBACK_WEBHOOK

export async function POST(req: Request) {
  if (!WEBHOOK_URL) {
    return NextResponse.json({ error: "Feedback not configured" }, { status: 503 })
  }

  try {
    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const { message } = body

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const trimmed = message.trim()
    if (trimmed.length < 2) {
      return NextResponse.json({ error: "Message too short" }, { status: 400 })
    }
    if (trimmed.length > 1000) {
      return NextResponse.json({ error: "Message too long (max 1000 characters)" }, { status: 400 })
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
      return NextResponse.json({ error: "Failed to send feedback" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
