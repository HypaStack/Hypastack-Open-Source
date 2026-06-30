import { NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { withAuth } from "@/lib/http/route"
import { getUserById, updateAvatarUrl } from "@/lib/models/userModel"
import { putObjectByKey, deleteByKey } from "@/lib/storage/r2"
import { fileTypeFromBuffer } from "file-type"
import { ALLOWED_AVATAR_TYPES } from "@/constants"
import { API_ERRORS } from "@/constants"
export const dynamic = "force-dynamic"

export const POST = withAuth(async ({ request, user: auth }) => {
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

    const user = await getUserById(auth.userId)
    if (user?.avatar_url) {
      const expectedPrefix = `profiles/${auth.userId}/`
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
    const avatarKey = `profiles/${auth.userId}/${hash}.${fileType.ext}`
    await putObjectByKey(avatarKey, buffer, fileType.mime)
    await updateAvatarUrl(auth.userId, avatarKey)

    return NextResponse.json({ success: true, url: avatarKey })
}, { rateLimit: true, label: "Avatar Upload" })
