import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"
import { getUserById, updateNickname } from "@/lib/user-model"
import { checkApiRateLimit } from "@/lib/rate-limit"

// Strict ciphertext format: base64(iv):base64(ciphertext), max 500 chars total
const CIPHERTEXT_REGEX = /^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/

const UpdateProfileSchema = z.object({
  nickname_encrypted: z.string()
    .min(10, "Ciphertext too short")
    .max(500, "Ciphertext too long")
    .regex(CIPHERTEXT_REGEX, "Invalid ciphertext format")
    .optional(),
  avatarUrl: z.string().url("Must be a valid URL").max(500, "URL too long").optional().or(z.literal(''))
})

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

    const body = await request.json()
    const validation = UpdateProfileSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { nickname_encrypted, avatarUrl } = validation.data
    const user = await getUserById(currentUser.userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (nickname_encrypted !== undefined) {
      // updateNickname stores the encrypted nickname directly
      await updateNickname(currentUser.userId, nickname_encrypted)
    }

    if (avatarUrl !== undefined) {
      const { updateAvatarUrl } = await import("@/lib/user-model")
      await updateAvatarUrl(currentUser.userId, avatarUrl === '' ? null : avatarUrl)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
      }
    })
  } catch (error) {
    console.error("[Auth] Update profile error:", error)
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}
