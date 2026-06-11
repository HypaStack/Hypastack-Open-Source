import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"
import { getUserById, updateNickname } from "@/lib/user-model"
import { checkApiRateLimit } from "@/lib/rate-limit"
import { API_ERRORS } from "@/constants"
// Strict ciphertext format: base64(iv):base64(ciphertext), max 500 chars total
const CIPHERTEXT_REGEX = /^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/

const UpdateProfileSchema = z.object({
  nickname_encrypted: z.string()
    .min(10, "Nickname too short")
    .max(500, "Nickname too long")
    .regex(CIPHERTEXT_REGEX, "Invalid format")
    .optional(),
})

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${"Not authenticated"}`);
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }
    const rateLimit = await checkApiRateLimit(currentUser.userId)
    if (!rateLimit.allowed) {
        console.error(`[API Error] 429 Too Many Requests: ${"429 Too Many Requests"}`);
      return NextResponse.json({ error: API_ERRORS.TOO_MANY_REQUESTS }, { status: 429 })
    }

    const body = await request.json()
    const validation = UpdateProfileSchema.safeParse(body)
    if (!validation.success) {
        console.error(`[API Error] 400 Bad Request: ${validation.error.issues[0].message}`);
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }

    const { nickname_encrypted } = validation.data
    const user = await getUserById(currentUser.userId)
    if (!user) {
        console.error(`[API Error] 404 Not Found: ${"404 Not Found"}`);
      return NextResponse.json({ error: API_ERRORS.NOT_FOUND }, { status: 404 })
    }

    if (nickname_encrypted !== undefined) {
      await updateNickname(currentUser.userId, nickname_encrypted)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
      }
    })
  } catch (error) {
    console.error("[Auth] 500 Failed to update profile:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"500 Failed to update profile"}`);
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}
