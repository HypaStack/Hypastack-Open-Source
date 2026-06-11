import { NextResponse } from "next/server"
const WEBHOOK_URL = process.env.DISCORD_FEEDBACK_WEBHOOK

export async function POST(req: Request) {
  if (!WEBHOOK_URL) {
      console.error(`[API Error] 503 Service Unavailable: ${"Feedback not configured"}`);
    return NextResponse.json({ error: "503 Service Unavailable" }, { status: 503 })
  }

  try {
    let body: any
    try {
      body = await req.json()
    } catch {
      console.error(`[API Error] 400 Bad Request: ${"Invalid JSON body"}`);
      return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
    }

    const { message } = body

    if (!message || typeof message !== "string") {
        console.error(`[API Error] 400 Bad Request: ${"Message is required"}`);
      return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
    }

    const trimmed = message.trim()
    if (trimmed.length < 2) {
        console.error(`[API Error] 400 Bad Request: ${"Message too short"}`);
      return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
    }
    if (trimmed.length > 1000) {
        console.error(`[API Error] 400 Bad Request: ${"Message too long (max 1000 characters)"}`);
      return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
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
        console.error(`[API Error] 500 Internal Server Error: ${"Failed to send feedback"}`);
      return NextResponse.json({ error: "500 Internal Server Error" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    console.error(`[API Error] 500 Internal Server Error: ${"Internal server error"}`);
    return NextResponse.json({ error: "500 Internal Server Error" }, { status: 500 })
  }
}
