import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserCredits, FREE_UNITS_PER_MONTH } from "@/lib/credits"
import { getPool, ensureDatabase } from "@/lib/db"
import { API_ERRORS } from "@/constants"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${"Authentication required"}`);
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    await ensureDatabase()
    const pool = getPool()

    const creditBalance = await getUserCredits(currentUser.userId)

    // Active purchases with remaining credits
    const purchases = await pool.query(
      `SELECT id, credits, remaining, amount_eur as "amountEur",
              expires_at as "expiresAt", created_at as "createdAt"
       FROM credit_purchases
       WHERE user_id = $1 AND status = 'completed' AND remaining > 0
         AND expires_at > NOW()
       ORDER BY created_at ASC`,
      [currentUser.userId]
    )

    const freeRemaining = Math.max(0, FREE_UNITS_PER_MONTH - creditBalance.monthlyUsage.freeUnitsUsed)

    return NextResponse.json({
      balance: creditBalance.balance,
      balanceEur: creditBalance.balanceEur,
      monthlyUsage: creditBalance.monthlyUsage,
      freeUnitsRemaining: freeRemaining,
      purchases: purchases.rows,
    })
  } catch (error: any) {
    console.error("[Credits Balance] Error:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to fetch credit balance"}`);
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}
