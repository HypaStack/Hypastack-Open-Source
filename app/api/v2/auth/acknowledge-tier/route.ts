import { getCurrentUser } from "@/lib/auth"
import { acknowledgeUserTier } from "@/lib/user-model"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Marks the current user's tier as "acknowledged" — i.e., they've seen
 * the "Thanks for supporting us" modal that fires after a tier upgrade.
 * Sets `last_acknowledged_tier = tier` so the modal won't fire again
 * until their tier changes.
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    await acknowledgeUserTier(currentUser.userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Acknowledge Tier] Error:", error)
    return NextResponse.json({ error: "Failed to acknowledge tier" }, { status: 500 })
  }
}
