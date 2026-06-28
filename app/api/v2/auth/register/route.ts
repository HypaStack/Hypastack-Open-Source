import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/api-error"
import { z } from "zod"
import { hashPassword } from "@/lib/auth"
import { createUser } from "@/lib/user-model"
import { checkRegisterRateLimit } from "@/lib/rate-limit"
import { verifyTurnstileToken } from "@/lib/turnstile"
import { validateCsrfToken } from "@/lib/security"
import { getHashedIp } from "@/lib/ip"
import { API_ERRORS } from "@/constants"
const CIPHERTEXT_REGEX = /^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/

const RegisterSchema = z.object({
  userId: z.string().uuid(),
  accessKey: z.string().startsWith("hpsk_").min(40),
  nickname_encrypted: z.string()
    .min(10, "Ciphertext too short")
    .max(500, "Ciphertext too long")
    .regex(CIPHERTEXT_REGEX, "Invalid ciphertext format"),
  turnstileToken: z.string().optional().default(""),
  csrfToken: z.string().min(1, "CSRF token required"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = RegisterSchema.safeParse(body)
    if (!validation.success) {
        return apiError(400, API_ERRORS.BAD_REQUEST, validation.error.issues[0].message)
    }

    const { userId, accessKey, nickname_encrypted, turnstileToken, csrfToken } = validation.data

    // The access key encodes the user id as hpsk_<uuid-no-hyphens>_<secret>,
    // and login derives the account id from that embedded segment. Reject any
    // registration whose declared userId disagrees with the key, so a client
    // can't create an account whose id and key are inconsistent.
    const embeddedId = accessKey.split("_")[1] || ""
    if (embeddedId.toLowerCase() !== userId.replace(/-/g, "").toLowerCase()) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Access key does not match account id")
    }

    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
        return apiError(403, API_ERRORS.FORBIDDEN, "Invalid security token. Please refresh the page and try again.")
    }

    if (process.env.NODE_ENV !== "development") {
      const turnstileResult = await verifyTurnstileToken(turnstileToken)
      if (!turnstileResult.success) {
          return apiError(403, API_ERRORS.FORBIDDEN, turnstileResult.error || "Security verification failed")
      }
    }

    const rateLimit = await checkRegisterRateLimit(getHashedIp(request))
    if (!rateLimit.allowed) {
        return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "Too many registration attempts. Please try again later.")
    }

    const { hash: passwordHash } = hashPassword(accessKey)

    await createUser({
      id: userId,
      nickname_encrypted,
      password_hash: passwordHash,
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("[Auth] Registration error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to create account")
  }
}
