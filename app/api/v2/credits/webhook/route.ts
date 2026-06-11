import { NextRequest, NextResponse } from "next/server"
import { constructWebhookEvent } from "@/lib/stripe"
import { addCredits } from "@/lib/credits"
import { API_ERRORS } from "@/constants"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
        console.error(`[API Error] 400 Bad Request: ${"Missing stripe-signature header"}`);
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }

    const event = constructWebhookEvent(rawBody, signature)

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any
      const { userId, credits, amountEur, purchaseId } = session.metadata || {}

      if (!userId || !credits || !amountEur || !purchaseId) {
        console.error("[Webhook] Missing metadata in session:", session.id)
          console.error(`[API Error] 400 Bad Request: ${"Missing metadata"}`);
        return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
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
    console.error(`[API Error] 400 Bad Request: ${"Webhook processing failed"}`);
    return NextResponse.json(
      { error: API_ERRORS.BAD_REQUEST },
      { status: 400 }
    )
  }
}
