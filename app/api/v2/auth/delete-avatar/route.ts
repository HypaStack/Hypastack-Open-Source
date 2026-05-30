import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserById, updateAvatarUrl } from "@/lib/user-model"
import { deleteByKey } from "@/lib/r2"
import { checkApiRateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

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
    if (user?.avatar_url) {
      try {
        await deleteByKey(user.avatar_url)
      } catch (err) {
        console.error("[Avatar] Failed to delete avatar from R2:", err)
      }
      await updateAvatarUrl(currentUser.userId, null)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Avatar] Delete error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete avatar" },
      { status: 500 }
    )
  }
}
