import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/api-error"
import { withRouteCache } from "@/lib/route-cache"
import { getCurrentUser } from "@/lib/auth"
import { getFilesByUserId } from "@/lib/file-model"
import { decryptFilename } from "@/lib/filename-crypto"
import { checkApiRateLimit } from "@/lib/rate-limit"
import { API_ERRORS } from "@/constants"

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        return apiError(401, API_ERRORS.UNAUTHORIZED, "401 Not Authenticated")
    }
    const rateLimit = await checkApiRateLimit(currentUser.userId)
    if (!rateLimit.allowed) {
        return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "429 Too Many Requests")
    }

    const files = await getFilesByUserId(currentUser.userId)
    
    return NextResponse.json({
      files: files.map(f => ({
        id: f.id,
        name: decryptFilename(f.custom_filename || f.original_name),
        size: f.file_size,
        contentType: f.content_type,
        uploadedAt: f.upload_date,
        expiresAt: f.expires_at,

        burnOnRead: f.burn_on_read,
        starred: !!f.starred,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/d/${f.id}`,
      }))
    })
  } catch (error) {
    console.error("[Auth Files] GET error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "500 File Fetch Failed")
  }
}
