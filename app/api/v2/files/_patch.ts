import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getFileById, toggleFileStarred } from "@/lib/file-model"
import { checkApiRateLimit } from "@/lib/rate-limit"
import { API_ERRORS } from "@/constants"

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${"401 Not Authenticated"}`);
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }
    const rateLimit = await checkApiRateLimit(currentUser.userId)
    if (!rateLimit.allowed) {
        console.error(`[API Error] 429 Too Many Requests: ${"429 Too Many Requests"}`);
      return NextResponse.json({ error: API_ERRORS.TOO_MANY_REQUESTS }, { status: 429 })
    }

    const { fileId, starred } = await request.json()
    if (!fileId || typeof starred !== "boolean") {
        console.error(`[API Error] 400 Bad Request: ${"400 Invalid Request Parameters"}`);
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }

    const file = await getFileById(fileId)
    if (!file || file.user_id !== currentUser.userId) {
        console.error(`[API Error] 404 Not Found: ${"404 Not Found"}`);
      return NextResponse.json({ error: API_ERRORS.NOT_FOUND }, { status: 404 })
    }

    const updated = await toggleFileStarred(fileId, currentUser.userId, starred)
    if (!updated) {
        console.error(`[API Error] 500 Internal Server Error: ${"500 Update Failed"}`);
      return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
    }

    return NextResponse.json({ success: true, starred })
  } catch (error) {
    console.error("[Auth Files] PATCH error:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"500 Update Failed"}`);
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}
