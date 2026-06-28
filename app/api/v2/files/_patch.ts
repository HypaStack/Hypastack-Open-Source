import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/api-error"
import { getCurrentUser } from "@/lib/auth"
import { getFileById, toggleFileStarred } from "@/lib/file-model"
import { checkApiRateLimit } from "@/lib/rate-limit"
import { API_ERRORS } from "@/constants"

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        return apiError(401, API_ERRORS.UNAUTHORIZED, "401 Not Authenticated")
    }
    const rateLimit = await checkApiRateLimit(currentUser.userId)
    if (!rateLimit.allowed) {
        return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "429 Too Many Requests")
    }

    const { fileId, starred } = await request.json()
    if (!fileId || typeof starred !== "boolean") {
        return apiError(400, API_ERRORS.BAD_REQUEST, "400 Invalid Request Parameters")
    }

    const file = await getFileById(fileId)
    if (!file || file.user_id !== currentUser.userId) {
        return apiError(404, API_ERRORS.NOT_FOUND, "404 Not Found")
    }

    const updated = await toggleFileStarred(fileId, currentUser.userId, starred)
    if (!updated) {
        return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "500 Update Failed")
    }

    return NextResponse.json({ success: true, starred })
  } catch (error) {
    console.error("[Auth Files] PATCH error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "500 Update Failed")
  }
}
