import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserById, updateAvatarUrl } from "@/lib/user-model"
import { putObjectByKey, deleteByKey } from "@/lib/r2"
import { checkApiRateLimit } from "@/lib/rate-limit"
import { fileTypeFromBuffer } from "file-type"
import { ALLOWED_AVATAR_TYPES } from "@/constants"
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

    const formData = await request.formData()
    const file = formData.get("avatar") as File | null

    if (!file) {
        console.error(`[API Error] 400 Bad Request: ${"400 No File Provided"}`);
      return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileType = await fileTypeFromBuffer(buffer)
    if (!fileType || !ALLOWED_AVATAR_TYPES.includes(fileType.mime)) {
        console.error(`[API Error] 415 Unsupported Media Type: ${"415 Invalid File Extension, only JPEG, PNG, WebP, and GIF are allowed."}`);
      return NextResponse.json({ error: "415 Unsupported Media Type" }, { status: 415 })
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
    console.error(`[API Error] 500 Internal Server Error: ${"500 Failed to upload avatar"}`);
    return NextResponse.json({ error: "500 Internal Server Error" }, { status: 500 })
  }
}
