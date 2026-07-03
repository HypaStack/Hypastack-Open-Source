import { NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { z } from "zod"
import { withAuth } from "@/lib/http/route"
import { getUserById, updateNickname, updateDisplayName } from "@/lib/models/userModel"
import { isPaidTier, normalizeTier } from "@/constants/tier-limits"
import { API_ERRORS } from "@/constants"
// Strict ciphertext format: base64(iv):base64(ciphertext), max 500 chars total
const CIPHERTEXT_REGEX = /^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/

const UpdateProfileSchema = z.object({
  nickname_encrypted: z.string()
    .min(10, "Nickname too short")
    .max(500, "Nickname too long")
    .regex(CIPHERTEXT_REGEX, "Invalid format")
    .optional(),
  // Public, unencrypted display name shown on download pages (e.g. "@Kiko").
  // Empty string clears it. Letters, numbers, spaces and . _ - only.
  display_name: z.string()
    .max(32, "Display name too long")
    .regex(/^[A-Za-z0-9 ._-]*$/, "Only letters, numbers, spaces and . _ -")
    .optional(),
})

export const POST = withAuth(async ({ request, user: auth }) => {
    const body = await request.json()
    const validation = UpdateProfileSchema.safeParse(body)
    if (!validation.success) {
        return apiError(400, API_ERRORS.BAD_REQUEST, validation.error.issues[0].message)
    }

    const { nickname_encrypted, display_name } = validation.data
    const user = await getUserById(auth.userId)
    if (!user) {
        return apiError(404, API_ERRORS.NOT_FOUND, "404 Not Found")
    }

    if (nickname_encrypted !== undefined) {
      await updateNickname(auth.userId, nickname_encrypted)
    }

    if (display_name !== undefined) {
      // Display name is part of the paid-plan download-page branding.
      if (!isPaidTier(normalizeTier(user.tier))) {
        return apiError(403, API_ERRORS.FORBIDDEN, "A display name is available on Essential and above.")
      }
      const trimmed = display_name.trim()
      await updateDisplayName(auth.userId, trimmed.length > 0 ? trimmed : null)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
      }
    })
}, { rateLimit: true, label: "Update Profile" })
