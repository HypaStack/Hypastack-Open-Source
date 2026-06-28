import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/api-error"
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
        return apiError(401, API_ERRORS.UNAUTHORIZED, "Not authenticated")
    }
    const rateLimit = await checkApiRateLimit(currentUser.userId)
    if (!rateLimit.allowed) {
        return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "429 Too Many Requests")
    }

    const body = await request.json()
    const validation = UpdateProfileSchema.safeParse(body)
    if (!validation.success) {
        return apiError(400, API_ERRORS.BAD_REQUEST, validation.error.issues[0].message)
    }

    const { nickname_encrypted } = validation.data
    const user = await getUserById(currentUser.userId)
    if (!user) {
        return apiError(404, API_ERRORS.NOT_FOUND, "404 Not Found")
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
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "500 Failed to update profile")
  }
}
