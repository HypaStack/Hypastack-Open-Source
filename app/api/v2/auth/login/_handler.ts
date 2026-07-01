import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import crypto from "crypto"
import { z } from "zod"
import { verifyPasswordAsync, generateToken, generateRefreshToken, setAuthCookie, setRefreshCookie, hashPassword } from "@/lib/security/auth"
import { getUserForAuthById, updateLastLogin, createUserSession } from "@/lib/models/userModel"
import { checkLoginRateLimit } from "@/lib/data/rateLimit"
import { verifyTurnstileToken } from "@/lib/security/turnstile"
import { validateCsrfToken } from "@/lib/security/security"
import { getHashedIp } from "@/lib/http/ip"
import { API_ERRORS } from "@/constants"

// keeping timing consistent.
const DUMMY_HASH = hashPassword("hpsk_0000000000000000000000000000000000000000_dummy").hash

const LoginSchema = z.object({
  accessKey: z.string().min(1, "Access key is required"),
  turnstileToken: z.string().optional().default(""),
  csrfToken: z.string().min(1, "CSRF Token not found"),
})

export async function handleLoginPost(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = LoginSchema.safeParse(body)
    if (!validation.success) {
      return apiError(400, API_ERRORS.BAD_REQUEST, validation.error.issues[0].message)
    }

    const { accessKey, turnstileToken, csrfToken } = validation.data

    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
      return apiError(403, API_ERRORS.FORBIDDEN, "Invalid csrf token, try again.")
    }

    if (process.env.NODE_ENV !== "development") {
      const turnstileResult = await verifyTurnstileToken(turnstileToken)
      if (!turnstileResult.success) {
        return apiError(403, API_ERRORS.FORBIDDEN, turnstileResult.error || "Security Verification failed")
      }
    }

    const rateLimit = await checkLoginRateLimit(getHashedIp(request))
    if (!rateLimit.allowed) {
      return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "rate limit exceeded")
    }

    // Key format: hpsk_<uuid_no_hyphens>_<secret>
    let matchedUserId: string | null = null
    const parts = accessKey.split("_")

    if (parts.length === 3 && parts[0] === "hpsk" && parts[1].length === 32) {
      const rawId = parts[1]
      const extractedId = `${rawId.slice(0, 8)}-${rawId.slice(8, 12)}-${rawId.slice(12, 16)}-${rawId.slice(16, 20)}-${rawId.slice(20)}`

      const user = await getUserForAuthById(extractedId)
      if (user && user.password_hash) {
        if (await verifyPasswordAsync(accessKey, user.password_hash)) {
          matchedUserId = user.id
        }
      } else {
        await verifyPasswordAsync(accessKey, DUMMY_HASH)
      }
    } else {
      await verifyPasswordAsync(accessKey, DUMMY_HASH)
    }

    if (!matchedUserId) {
      return apiError(401, API_ERRORS.UNAUTHORIZED, "Invalid access key")
    }

    await updateLastLogin(matchedUserId)
    const refreshToken = generateRefreshToken()
    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex")
    const sessionId = await createUserSession(matchedUserId, refreshTokenHash)
    const token = generateToken({ userId: matchedUserId, sessionId })
    await setAuthCookie(token)
    await setRefreshCookie(refreshToken)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("[Auth] Login error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to sign in")
  }
}
