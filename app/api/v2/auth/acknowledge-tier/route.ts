import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"
import { acknowledgeUserTier } from "@/lib/user-model"
import { NextRequest, NextResponse } from "next/server"
import { API_ERRORS } from "@/constants"
export const dynamic = "force-dynamic"

// marks as acknowledged
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        return apiError(401, API_ERRORS.UNAUTHORIZED, "Authentication required")
    }

    await acknowledgeUserTier(currentUser.userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Acknowledge Tier] Error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to acknowledge tier")
  }
}
