import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getPool, ensureDatabase } from "@/lib/db"
import { normalizeTier, isPaidTier } from "@/lib/tier-limits"
import { getUserById } from "@/lib/user-model"
import { checkApiRateLimit } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const rateLimit = await checkApiRateLimit(currentUser.userId)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit reached, try again later" },
        { status: 429 }
      )
    }

    const user = await getUserById(currentUser.userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const tier = normalizeTier(user.tier)

    // Free tier is locked at 7 days — no customization
    if (!isPaidTier(tier)) {
      return NextResponse.json(
        { error: "Free accounts are fixed at 7 days. Upgrade to customize." },
        { status: 403 }
      )
    }

    const body = await request.json()
    let days = body.days

    // Sanitize: must be an integer
    if (typeof days !== "number" || !Number.isFinite(days) || !Number.isInteger(days)) {
      return NextResponse.json({ error: "Days must be a whole number." }, { status: 400 })
    }

    // Clamp to valid range: 7–365
    const MIN_DAYS = 7
    const MAX_DAYS = 365
    if (days < MIN_DAYS || days > MAX_DAYS) {
      return NextResponse.json(
        { error: `Days must be between ${MIN_DAYS} and ${MAX_DAYS}.` },
        { status: 400 }
      )
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
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 })
  }
}
