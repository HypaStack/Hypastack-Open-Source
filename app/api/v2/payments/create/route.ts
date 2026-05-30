import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getCurrentUser } from "@/lib/auth"
import { getPool, ensureDatabase } from "@/lib/db"
import { createSubaddress, xmrToAtomicUnits } from "@/lib/monero"
import {
  getTierPriceXmr,
  isPurchasableTier,
  PAYMENT_EXPIRY_MS,
} from "@/lib/payment-config"

export const dynamic = "force-dynamic"

/**
 * POST /api/v2/payments/create
 *
 * Creates a new XMR payment invoice for a tier upgrade.
 * Returns the Monero subaddress the user should send funds to,
 * plus the exact amount and expiry.
 *
 * Body: { tier: "essential" | "premium" | "ultimate" }
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { tier } = body

    if (!tier || !isPurchasableTier(tier)) {
      return NextResponse.json(
        { error: "Invalid tier. Must be essential, premium, or ultimate." },
        { status: 400 }
      )
    }

    await ensureDatabase()
    const pool = getPool()

    // Check if user already has a pending payment
    const existing = await pool.query(
      `SELECT id, subaddress, amount_xmr, tier, expires_at
       FROM xmr_payments
       WHERE user_id = $1 AND status = 'pending' AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [currentUser.userId]
    )

    if (existing.rows.length > 0) {
      const row = existing.rows[0]
      // If they have a pending payment for the same tier, return it
      if (row.tier === tier) {
        return NextResponse.json({
          paymentId: row.id,
          address: row.subaddress,
          amount: parseFloat(row.amount_xmr),
          tier,
          expiresAt: row.expires_at,
          existing: true,
        })
      }
      // Different tier — cancel the old one
      await pool.query(
        `UPDATE xmr_payments SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
        [row.id]
      )
    }

    // Generate price
    const priceXmr = getTierPriceXmr(tier)
    if (priceXmr <= 0) {
      return NextResponse.json({ error: "Cannot purchase this tier" }, { status: 400 })
    }

    const amountAtomic = xmrToAtomicUnits(priceXmr)

    // Create a unique Monero subaddress for this payment
    const paymentId = crypto.randomUUID()
    const label = `hypastack_${paymentId.slice(0, 8)}_${tier}`
    const subaddr = await createSubaddress(label)

    const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_MS)

    // Store in DB
    await pool.query(
      `INSERT INTO xmr_payments
        (id, user_id, tier, amount_atomic, amount_xmr, subaddress, subaddress_index, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)`,
      [
        paymentId,
        currentUser.userId,
        tier,
        amountAtomic,
        priceXmr,
        subaddr.address,
        subaddr.address_index,
        expiresAt,
      ]
    )

    return NextResponse.json({
      paymentId,
      address: subaddr.address,
      amount: priceXmr,
      tier,
      expiresAt: expiresAt.toISOString(),
      existing: false,
    })
  } catch (error: any) {
    console.error("[Payment Create] Error:", error)
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    )
  }
}
