import { NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { z } from "zod"
import { withAuth } from "@/lib/http/route"
import {
  getUserById,
  updateNickname,
  updateDisplayName,
  isDisplayNameTaken,
  isDisplayNameHeld,
  holdDisplayName,
} from "@/lib/models/userModel"
import { isPaidTier, normalizeTier } from "@/constants/tier-limits"
import { NICKNAME_CHANGE_COOLDOWN_MS, DISPLAY_NAME_CHANGE_COOLDOWN_MS } from "@/constants/profile"
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

// Remaining cooldown in ms, or 0 if the window has elapsed / was never started.
function cooldownLeftMs(changedAt: Date | null, cooldownMs: number): number {
  if (!changedAt) return 0
  const left = new Date(changedAt).getTime() + cooldownMs - Date.now()
  return left > 0 ? left : 0
}

function fmtDays(ms: number): string {
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000))
  return days <= 1 ? "1 day" : `${days} days`
}

// apiError's 2nd arg is a generic status label; the client shows `message`, so
// user-facing reasons are passed through the extra body here too.
function friendly(status: number, code: string, msg: string) {
  return apiError(status, code, msg, { message: msg })
}

export const POST = withAuth(async ({ request, user: auth }) => {
    const body = await request.json()
    const validation = UpdateProfileSchema.safeParse(body)
    if (!validation.success) {
        return friendly(400, API_ERRORS.BAD_REQUEST, validation.error.issues[0].message)
    }

    const { nickname_encrypted, display_name } = validation.data
    const user = await getUserById(auth.userId)
    if (!user) {
        return apiError(404, API_ERRORS.NOT_FOUND, "404 Not Found")
    }

    // --- Account nickname (stored encrypted): time cooldown only ---
    if (nickname_encrypted !== undefined) {
      const left = cooldownLeftMs(user.nickname_changed_at, NICKNAME_CHANGE_COOLDOWN_MS)
      if (left > 0) {
        return friendly(429, API_ERRORS.TOO_MANY_REQUESTS, `You can change your username again in ${fmtDays(left)}.`)
      }
      await updateNickname(auth.userId, nickname_encrypted)
    }

    // --- Public display name: cooldown + uniqueness + release hold ---
    if (display_name !== undefined) {
      if (!isPaidTier(normalizeTier(user.tier))) {
        return friendly(403, API_ERRORS.FORBIDDEN, "A display name is available on Essential and above.")
      }

      const trimmed = display_name.trim()
      const newVal = trimmed.length > 0 ? trimmed : null
      const oldVal = user.display_name
      const sameAsCurrent = (newVal?.toLowerCase() ?? "") === (oldVal?.toLowerCase() ?? "")

      if (!sameAsCurrent) {
        const left = cooldownLeftMs(user.display_name_changed_at, DISPLAY_NAME_CHANGE_COOLDOWN_MS)
        if (left > 0) {
          return friendly(429, API_ERRORS.TOO_MANY_REQUESTS, `You can change your display name again in ${fmtDays(left)}.`)
        }

        if (newVal) {
          const nameLower = newVal.toLowerCase()
          if (await isDisplayNameTaken(nameLower, auth.userId)) {
            return friendly(409, API_ERRORS.CONFLICT, "That display name is already taken.")
          }
          if (await isDisplayNameHeld(nameLower)) {
            return friendly(409, API_ERRORS.CONFLICT, "That display name was recently used and is temporarily unavailable.")
          }
        }

        try {
          await updateDisplayName(auth.userId, newVal)
        } catch (e: any) {
          // Unique-index race: someone claimed it a moment earlier.
          if (e?.code === "23505") {
            return friendly(409, API_ERRORS.CONFLICT, "That display name was just taken. Try another.")
          }
          throw e
        }

        // Hold the name we just released so it can't be instantly re-registered.
        if (oldVal) {
          try {
            await holdDisplayName(oldVal.toLowerCase(), auth.userId)
          } catch (e) {
            console.error("[Profile] Failed to hold released display name:", e)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
      }
    })
}, { rateLimit: true, label: "Update Profile" })
