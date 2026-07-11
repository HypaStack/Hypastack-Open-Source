import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import crypto from "crypto"
import { z } from "zod"
import { verifyPasswordAsync, generateToken, generateRefreshToken, setAuthCookie, setRefreshCookie, hashPassword, computeKeyLookup } from "@/lib/security/auth"
import { getUserForAuthById, getUserForAuthByKeyLookup, setUserKeyLookup, updateLastLogin, createUserSession } from "@/lib/models/userModel"
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

    // Legacy identifiers embed the account id (hpsk_<uuid32>_<secret>); new
    // cid_ identifiers don't, so those are resolved via the deterministic
    // key_lookup column. Either way the PBKDF2 password_hash authenticates.
    let matchedUserId: string | null = null
    const parts = accessKey.split("_")
    const isLegacy = parts.length === 3 && parts[0] === "hpsk" && parts[1].length === 32

    if (isLegacy) {
      const rawId = parts[1]
      const extractedId = `${rawId.slice(0, 8)}-${rawId.slice(8, 12)}-${rawId.slice(12, 16)}-${rawId.slice(16, 20)}-${rawId.slice(20)}`

      const user = await getUserForAuthById(extractedId)
      if (user && user.password_hash) {
        if (await verifyPasswordAsync(accessKey, user.password_hash)) {
          matchedUserId = user.id
          // Backfill so future logins can also use the indexed lookup path.
          await setUserKeyLookup(user.id, computeKeyLookup(accessKey))
        }
      } else {
        await verifyPasswordAsync(accessKey, DUMMY_HASH)
      }
    } else {
      const user = await getUserForAuthByKeyLookup(computeKeyLookup(accessKey))
      if (user && user.password_hash) {
        if (await verifyPasswordAsync(accessKey, user.password_hash)) {
          matchedUserId = user.id
        }
      } else {
        await verifyPasswordAsync(accessKey, DUMMY_HASH)
      }
    }

    if (!matchedUserId) {
      return apiError(401, API_ERRORS.INVALID_IDENTIFIER, "Invalid identifier")
    }

    await updateLastLogin(matchedUserId)
    const refreshToken = generateRefreshToken()
    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex")
    const sessionId = await createUserSession(matchedUserId, refreshTokenHash)
    const token = generateToken({ userId: matchedUserId, sessionId })
    await setAuthCookie(token)
    await setRefreshCookie(refreshToken)

    // Return the resolved account id so the client can derive its E2E master
    // key for cid_ identifiers (which, unlike legacy hpsk_ keys, don't embed it).
    return NextResponse.json({ success: true, userId: matchedUserId })

  } catch (error) {
    console.error("[Auth] Login error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to sign in")
  }
}
