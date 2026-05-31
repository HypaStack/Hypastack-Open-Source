import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getPool, ensureDatabase } from "@/lib/db"
import { getTransfers, atomicUnitsToXmr } from "@/lib/monero"
import {
  REQUIRED_CONFIRMATIONS,
  AMOUNT_TOLERANCE,
  PAYMENT_DURATION_DAYS,
} from "@/lib/payment-config"
import { processTaxRecord } from "@/lib/tax"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const paymentId = request.nextUrl.searchParams.get("id")
    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID required" }, { status: 400 })
    }

    await ensureDatabase()
    const pool = getPool()

    const result = await pool.query(
      `SELECT * FROM xmr_payments WHERE id = $1 AND user_id = $2`,
      [paymentId, currentUser.userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    const payment = result.rows[0]

    if (payment.status === "confirmed") {
      return NextResponse.json({
        status: "confirmed",
        confirmations: payment.confirmations,
        requiredConfirmations: REQUIRED_CONFIRMATIONS,
        txid: payment.txid,
        tier: payment.tier,
        amount: parseFloat(payment.amount_xmr),
      })
    }

    if (payment.status === "expired" || payment.status === "cancelled" || payment.status === "underpaid") {
      return NextResponse.json({
        status: payment.status,
        tier: payment.tier,
        amount: parseFloat(payment.amount_xmr),
      })
    }

    if (new Date(payment.expires_at) < new Date()) {
      await pool.query(
        `UPDATE xmr_payments SET status = 'expired', updated_at = NOW() WHERE id = $1`,
        [paymentId]
      )
      return NextResponse.json({
        status: "expired",
        tier: payment.tier,
        amount: parseFloat(payment.amount_xmr),
      })
    }

    const { confirmed, pending } = await getTransfers(payment.subaddress_index)
    const allTransfers = [...confirmed, ...pending]

    const expectedAtomic = BigInt(payment.amount_atomic)
    const toleranceAtomic = BigInt(Math.floor(Number(expectedAtomic) * AMOUNT_TOLERANCE))
    const minAccepted = expectedAtomic - toleranceAtomic
    const maxAccepted = expectedAtomic + toleranceAtomic

    let matchedTx = null
    for (const tx of allTransfers) {
      const txAmount = BigInt(tx.amount)
      if (txAmount >= minAccepted && txAmount <= maxAccepted) {
        matchedTx = tx
        break
      }
      // Accept overpayments
      if (txAmount > maxAccepted) {
        matchedTx = tx
        break
      }
    }

    if (!matchedTx) {
      return NextResponse.json({
        status: "pending",
        confirmations: 0,
        requiredConfirmations: REQUIRED_CONFIRMATIONS,
        tier: payment.tier,
        amount: parseFloat(payment.amount_xmr),
        address: payment.subaddress,
        expiresAt: payment.expires_at,
      })
    }

    const confs = matchedTx.confirmations || 0

    if (confs >= REQUIRED_CONFIRMATIONS) {
      const paidUntil = new Date(Date.now() + PAYMENT_DURATION_DAYS * 24 * 60 * 60 * 1000)

      await pool.query(
        `UPDATE xmr_payments
         SET status = 'confirmed',
             txid = $1,
             confirmations = $2,
             paid_at = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [matchedTx.txid, confs, paymentId]
      )

      await pool.query(
        `UPDATE users
         SET tier = $1,
             premium = TRUE,
             paid_until = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [payment.tier, paidUntil, currentUser.userId]
      )

      try {
        const pdfBuffer = await processTaxRecord(
          currentUser.userId,
          matchedTx.txid,
          parseInt(payment.amount_atomic),
          payment.tier
        )
        const pdfBase64 = pdfBuffer.toString("base64")
        
        await pool.query(
          `UPDATE xmr_payments SET receipt_base64 = $1 WHERE id = $2`,
          [pdfBase64, paymentId]
        )
      } catch (err) {
        console.error("[Tax] Failed to process tax record or receipt:", err)
      }

      return NextResponse.json({
        status: "confirmed",
        confirmations: confs,
        requiredConfirmations: REQUIRED_CONFIRMATIONS,
        txid: matchedTx.txid,
        tier: payment.tier,
        amount: parseFloat(payment.amount_xmr),
        paidUntil: paidUntil.toISOString(),
      })
    }

    await pool.query(
      `UPDATE xmr_payments
       SET status = 'confirming',
           txid = $1,
           confirmations = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [matchedTx.txid, confs, paymentId]
    )

    return NextResponse.json({
      status: "confirming",
      confirmations: confs,
      requiredConfirmations: REQUIRED_CONFIRMATIONS,
      txid: matchedTx.txid,
      tier: payment.tier,
      amount: parseFloat(payment.amount_xmr),
      address: payment.subaddress,
    })
  } catch (error: any) {
    console.error("[Payment Status] Error:", error)
    return NextResponse.json(
      { error: "Failed to check payment status" },
      { status: 500 }
    )
  }
}
