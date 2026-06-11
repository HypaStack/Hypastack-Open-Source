import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getPool, ensureDatabase } from "@/lib/db"
import { normalizeTier, isPaidTier } from "@/constants/tier-limits"
import { getUserById } from "@/lib/user-model"
import { checkApiRateLimit } from "@/lib/rate-limit"
import { MIN_INACTIVITY_PURGE_DAYS, MAX_INACTIVITY_PURGE_DAYS } from "@/constants"

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${"Not authenticated"}`);
      return NextResponse.json({ error: "401 Unauthorized" }, { status: 401 })
    }

    const rateLimit = await checkApiRateLimit(currentUser.userId)
    if (!rateLimit.allowed) {
        console.error(`[API Error] 429 Too Many Requests: ${"429 Too Many Requests"}`);
      return NextResponse.json({ error: "429 Too Many Requests" }, { status: 429 })
    }

    const user = await getUserById(currentUser.userId)
    if (!user) {
        console.error(`[API Error] 404 Not Found: ${"User not found"}`);
      return NextResponse.json({ error: "404 Not Found" }, { status: 404 })
    }

    const tier = normalizeTier(user.tier)

    // 7 days
    if (!isPaidTier(tier)) {
        console.error(`[API Error] 403 Forbidden: ${"Free accounts are fixed at 7 days. Upgrade to customize."}`);
      return NextResponse.json({ error: "403 Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    let days = body.days

    // must be integer
    if (typeof days !== "number" || !Number.isFinite(days) || !Number.isInteger(days)) {
        console.error(`[API Error] 400 Bad Request: ${"Days must be a whole number."}`);
      return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
    }

    // Clamp to valid range: 7–365
    if (days < MIN_INACTIVITY_PURGE_DAYS || days > MAX_INACTIVITY_PURGE_DAYS) {
        console.error(`[API Error] 400 Bad Request: ${`Days must be between ${MIN_INACTIVITY_PURGE_DAYS} and ${MAX_INACTIVITY_PURGE_DAYS}.`}`);
      return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
    }

    await ensureDatabase()
    const pool = getPool()
    await pool.query(
      `UPDATE users SET inactivity_purge_days = $1, updated_at = NOW() WHERE id = $2`,
      [days, currentUser.userId]
    )

    return NextResponse.json({ success: true, inactivityPurgeDays: days })
  } catch (error) {
    console.error("[API] Update inactivity purge error:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to update setting"}`);
    return NextResponse.json({ error: "500 Internal Server Error" }, { status: 500 })
  }
}
