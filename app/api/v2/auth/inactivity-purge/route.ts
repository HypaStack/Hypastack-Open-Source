import { apiError } from "@/lib/api-error"
import { withAuth } from "@/lib/route"
import { getPool, ensureDatabase } from "@/lib/db"
import { normalizeTier, isPaidTier } from "@/constants/tier-limits"
import { getUserById } from "@/lib/user-model"
import { NextResponse } from "next/server"
import { MIN_INACTIVITY_PURGE_DAYS, MAX_INACTIVITY_PURGE_DAYS } from "@/constants"
import { API_ERRORS } from "@/constants"

export const POST = withAuth(async ({ request, user: auth }) => {
    const user = await getUserById(auth.userId)
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
      [days, auth.userId]
    )

    return NextResponse.json({ success: true, inactivityPurgeDays: days })
}, { rateLimit: true, label: "Inactivity Purge" })
