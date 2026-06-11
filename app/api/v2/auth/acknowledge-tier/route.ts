import { getCurrentUser } from "@/lib/auth"
import { acknowledgeUserTier } from "@/lib/user-model"
import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

// marks as acknowledged
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${"Authentication required"}`);
      return NextResponse.json({ error: "401 Unauthorized" }, { status: 401 })
    }

    await acknowledgeUserTier(currentUser.userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Acknowledge Tier] Error:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to acknowledge tier"}`);
    return NextResponse.json({ error: "500 Internal Server Error" }, { status: 500 })
  }
}
