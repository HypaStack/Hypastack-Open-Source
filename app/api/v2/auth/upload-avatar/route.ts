import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserById, updateAvatarUrl } from "@/lib/user-model"
import { putObjectByKey, deleteByKey } from "@/lib/r2"
import { checkApiRateLimit } from "@/lib/rate-limit"
import { fileTypeFromBuffer } from "file-type"

const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

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

    const formData = await request.formData()
    const file = formData.get("avatar") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileType = await fileTypeFromBuffer(buffer)
    if (!fileType || !ALLOWED_AVATAR_TYPES.includes(fileType.mime)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." },
        { status: 415 }
      )
    }

    const user = await getUserById(currentUser.userId)
    if (user?.avatar_url) {
      // Only delete if the key belongs to this user's profile directory
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
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    )
  }
}
