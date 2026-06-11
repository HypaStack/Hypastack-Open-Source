import { NextRequest, NextResponse } from "next/server"
import { expireOldCredits } from "@/lib/credits"
import { getPool, ensureDatabase } from "@/lib/db"
import crypto from "crypto"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get("secret")
    const envSecret = process.env.CRON_SECRET || ""

    if (!secret || !envSecret) {
        console.error(`[API Error] 401 Unauthorized: ${"Unauthorized"}`);
      return NextResponse.json({ error: "401 Unauthorized" }, { status: 401 })
    }

    const secretHash = crypto.createHash("sha256").update(secret).digest()
    const envSecretHash = crypto.createHash("sha256").update(envSecret).digest()

    if (!crypto.timingSafeEqual(secretHash, envSecretHash)) {
        console.error(`[API Error] 401 Unauthorized: ${"Unauthorized"}`);
      return NextResponse.json({ error: "401 Unauthorized" }, { status: 401 })
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
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to run credit expiry"}`);
    return NextResponse.json(
      { error: "500 Internal Server Error" },
      { status: 500 }
    )
  }
}
