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
        console.error(`[API Error] 401 Unauthorized: ${"401 Not Authenticated"}`);
      return NextResponse.json({ error: "401 Unauthorized" }, { status: 401 })
    }
    const rateLimit = await checkApiRateLimit(currentUser.userId)
    if (!rateLimit.allowed) {
        console.error(`[API Error] 429 Too Many Requests: ${"429 Too Many Requests"}`);
      return NextResponse.json({ error: "429 Too Many Requests" }, { status: 429 })
    }

    const user = await getUserById(currentUser.userId)
    if (user?.avatar_url) {
      const expectedPrefix = `profiles/${currentUser.userId}/`
      if (user.avatar_url.startsWith(expectedPrefix)) {
        try {
          await deleteByKey(user.avatar_url)
        } catch (err) {
          console.error("[Avatar] Failed to delete avatar from R2:", err)
        }
      }
      await updateAvatarUrl(currentUser.userId, null)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Avatar] Delete error:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"500 Avatar Deletion Failed"}`);
    return NextResponse.json({ error: "500 Internal Server Error" }, { status: 500 })
  }
}
