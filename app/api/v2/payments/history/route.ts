import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getPool, ensureDatabase } from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * GET /api/v2/payments/history
 *
 * Returns the user's payment history, newest first.
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    await ensureDatabase()
    const pool = getPool()

    const result = await pool.query(
      `SELECT id, tier, amount_xmr, status, txid, confirmations, paid_at, created_at, expires_at, receipt_base64
       FROM xmr_payments
       WHERE user_id = $1 AND status != 'cancelled'
       ORDER BY created_at DESC
       LIMIT 50`,
      [currentUser.userId]
    )

    return NextResponse.json({
      payments: result.rows.map((r) => ({
        id: r.id,
        tier: r.tier,
        amount: parseFloat(r.amount_xmr),
        status: r.status,
        txid: r.txid,
        confirmations: r.confirmations,
        paidAt: r.paid_at,
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        receiptBase64: r.receipt_base64,
      })),
    })
  } catch (error: any) {
    console.error("[Payment History] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch payment history" },
      { status: 500 }
    )
  }
}
