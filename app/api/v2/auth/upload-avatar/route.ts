import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/api-error"
import { getCurrentUser } from "@/lib/auth"
import { getUserById, updateAvatarUrl } from "@/lib/user-model"
import { putObjectByKey, deleteByKey } from "@/lib/r2"
import { checkApiRateLimit } from "@/lib/rate-limit"
import { fileTypeFromBuffer } from "file-type"
import { ALLOWED_AVATAR_TYPES } from "@/constants"
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

    const formData = await request.formData()
    const file = formData.get("avatar") as File | null

    if (!file) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "400 No File Provided")
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileType = await fileTypeFromBuffer(buffer)
    if (!fileType || !ALLOWED_AVATAR_TYPES.includes(fileType.mime)) {
        return apiError(415, API_ERRORS.UNSUPPORTED_MEDIA_TYPE, "415 Invalid File Extension, only JPEG, PNG, WebP, and GIF are allowed.")
    }

    const user = await getUserById(currentUser.userId)
    if (user?.avatar_url) {
      const expectedPrefix = `profiles/${currentUser.userId}/`
      if (user.avatar_url.startsWith(expectedPrefix)) {
        try {
          await deleteByKey(user.avatar_url)
        } catch (err) {
          console.error("[Avatar] Failed to delete old avatar:", err)
        }
      }
    }

    // Upload avatar to R2 with hashed filename
    const { createHash } = await import("crypto")
    const hash = createHash("md5").update(buffer).digest("hex")
    const avatarKey = `profiles/${currentUser.userId}/${hash}.${fileType.ext}`
    await putObjectByKey(avatarKey, buffer, fileType.mime)
    await updateAvatarUrl(currentUser.userId, avatarKey)

    return NextResponse.json({ success: true, url: avatarKey })
  } catch (error: any) {
    console.error("[Avatar] Upload error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "500 Failed to upload avatar")
  }
}
