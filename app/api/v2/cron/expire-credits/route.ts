import { NextRequest, NextResponse } from "next/server"
import { expireOldCredits } from "@/lib/credits"
import { getPool, ensureDatabase } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get("secret")
    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await ensureDatabase()

    const expired = await expireOldCredits()

    // Clean up operation_logs older than 90 days
    const pool = getPool()
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const cleanResult = await pool.query(
      `DELETE FROM operation_logs WHERE created_at < $1`,
      [cutoff]
    )

    return NextResponse.json({
      expired,
      cleaned: cleanResult.rowCount ?? 0,
    })
  } catch (error: any) {
    console.error("[Cron Expire Credits] Error:", error)
    return NextResponse.json(
      { error: "Failed to run credit expiry" },
      { status: 500 }
    )
  }
}
