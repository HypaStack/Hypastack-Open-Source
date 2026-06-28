import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/api-error"
import { getCurrentUser } from "@/lib/auth"
import { getUserById, updateAvatarUrl } from "@/lib/user-model"
import { deleteByKey } from "@/lib/r2"
import { checkApiRateLimit } from "@/lib/rate-limit"
import { API_ERRORS } from "@/constants"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        return apiError(401, API_ERRORS.UNAUTHORIZED, "401 Not Authenticated")
    }
    const rateLimit = await checkApiRateLimit(currentUser.userId)
    if (!rateLimit.allowed) {
        return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "429 Too Many Requests")
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
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "500 Avatar Deletion Failed")
  }
}
