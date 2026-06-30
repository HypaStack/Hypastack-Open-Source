import { NextResponse } from "next/server"
import { apiError } from "@/lib/api-error"
import { z } from "zod"
import { withAuth } from "@/lib/route"
import { getUserById, updateNickname } from "@/lib/user-model"
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

export const POST = withAuth(async ({ request, user: auth }) => {
    const body = await request.json()
    const validation = UpdateProfileSchema.safeParse(body)
    if (!validation.success) {
        return apiError(400, API_ERRORS.BAD_REQUEST, validation.error.issues[0].message)
    }

    const { nickname_encrypted } = validation.data
    const user = await getUserById(auth.userId)
    if (!user) {
        return apiError(404, API_ERRORS.NOT_FOUND, "404 Not Found")
    }

    if (nickname_encrypted !== undefined) {
      await updateNickname(auth.userId, nickname_encrypted)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
      }
    })
}, { rateLimit: true, label: "Update Profile" })
