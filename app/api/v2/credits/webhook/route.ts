import { NextRequest, NextResponse } from "next/server"
import { constructWebhookEvent } from "@/lib/stripe"
import { addCredits } from "@/lib/credits"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
    }

    const event = constructWebhookEvent(rawBody, signature)

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any
      const { userId, credits, amountEur, purchaseId } = session.metadata || {}

      if (!userId || !credits || !amountEur || !purchaseId) {
        console.error("[Webhook] Missing metadata in session:", session.id)
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
      }

      await addCredits(
        userId,
        purchaseId,
        parseInt(credits, 10),
        parseFloat(amountEur),
        session.id
      )
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[Webhook] Error:", error.message)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 400 }
    )
  }
}
