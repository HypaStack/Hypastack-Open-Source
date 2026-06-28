import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/api-error"
import { getCurrentUser } from "@/lib/auth"
import { getPool, ensureDatabase } from "@/lib/db"
import { normalizeTier, isPaidTier } from "@/constants/tier-limits"
import { getUserById } from "@/lib/user-model"
import { checkApiRateLimit } from "@/lib/rate-limit"
import { MIN_INACTIVITY_PURGE_DAYS, MAX_INACTIVITY_PURGE_DAYS } from "@/constants"
import { API_ERRORS } from "@/constants"

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        return apiError(401, API_ERRORS.UNAUTHORIZED, "Not authenticated")
    }

    const rateLimit = await checkApiRateLimit(currentUser.userId)
    if (!rateLimit.allowed) {
        return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "429 Too Many Requests")
    }

    const user = await getUserById(currentUser.userId)
    if (!user) {
        return apiError(404, API_ERRORS.NOT_FOUND, "User not found")
    }

    const tier = normalizeTier(user.tier)

    // 7 days
    if (!isPaidTier(tier)) {
        return apiError(403, API_ERRORS.FORBIDDEN, "Free accounts are fixed at 7 days. Upgrade to customize.")
    }

    const body = await request.json()
    let days = body.days

    // must be integer
    if (typeof days !== "number" || !Number.isFinite(days) || !Number.isInteger(days)) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Days must be a whole number.")
    }

    // Clamp to valid range: 7–365
    if (days < MIN_INACTIVITY_PURGE_DAYS || days > MAX_INACTIVITY_PURGE_DAYS) {
        return apiError(400, API_ERRORS.BAD_REQUEST, `Days must be between ${MIN_INACTIVITY_PURGE_DAYS} and ${MAX_INACTIVITY_PURGE_DAYS}.`)
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
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to update setting")
  }
}
