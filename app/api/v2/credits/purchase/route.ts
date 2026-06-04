import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getCurrentUser } from "@/lib/auth"
import { getPool, ensureDatabase } from "@/lib/db"
import {
  createCheckoutSession,
  calculateCredits,
  MIN_CUSTOM_AMOUNT_EUR,
  CREDIT_PACKAGES,
} from "@/lib/stripe"

export const dynamic = "force-dynamic"

const VALID_AMOUNTS: readonly number[] = CREDIT_PACKAGES.map((p) => p.amountEur)

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { amount } = body

    if (!amount || typeof amount !== "number" || !Number.isInteger(amount)) {
      return NextResponse.json({ error: "Amount must be an integer in EUR" }, { status: 400 })
    }

    const isPackage = VALID_AMOUNTS.includes(amount)
    const isValidCustom = amount >= MIN_CUSTOM_AMOUNT_EUR

    if (!isPackage && !isValidCustom) {
      return NextResponse.json(
        { error: `Amount must be one of ${VALID_AMOUNTS.join(", ")} or a custom amount >= ${MIN_CUSTOM_AMOUNT_EUR} EUR` },
        { status: 400 }
      )
    }

    const credits = calculateCredits(amount)

    await ensureDatabase()
    const pool = getPool()

    const purchaseId = crypto.randomUUID()

    await pool.query(
      `INSERT INTO credit_purchases
        (id, user_id, amount_eur, credits, remaining, status, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $4, 'pending', NOW() + INTERVAL '6 months', NOW())`,
      [purchaseId, currentUser.userId, amount, credits]
    )

    const origin = request.headers.get("origin") || request.headers.get("referer")?.replace(/\/[^/]*$/, "") || "https://hypastack.com"

    const session = await createCheckoutSession({
      amountEur: amount,
      credits,
      userId: currentUser.userId,
      purchaseId,
      origin,
    })

    await pool.query(
      `UPDATE credit_purchases SET stripe_session_id = $1 WHERE id = $2`,
      [session.id, purchaseId]
    )

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      credits,
    })
  } catch (error: any) {
    console.error("[Credits Purchase] Error:", error)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
