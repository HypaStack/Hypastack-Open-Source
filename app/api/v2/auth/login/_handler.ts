import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyPassword, generateToken, setAuthCookie, hashPassword } from "@/lib/auth"
import { getUserForAuthById, updateLastLogin, createUserSession } from "@/lib/user-model"
import { checkLoginRateLimit } from "@/lib/rate-limit"
import { verifyTurnstileToken } from "@/lib/turnstile"
import { validateCsrfToken } from "@/lib/security"
import { getHashedIp } from "@/lib/ip"
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
        console.error(`[API Error] 400 Bad Request: ${validation.error.issues[0].message}`);
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }

    const { accessKey, turnstileToken, csrfToken } = validation.data

    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
        console.error(`[API Error] 403 Forbidden: ${"Invalid csrf token, try again."}`);
      return NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
    }

    if (process.env.NODE_ENV !== "development") {
      const turnstileResult = await verifyTurnstileToken(turnstileToken)
      if (!turnstileResult.success) {
          console.error(`[API Error] 403 Forbidden: ${turnstileResult.error || "Security Verification failed"}`);
        return NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
      }
    }

    const rateLimit = await checkLoginRateLimit(getHashedIp(request))
    if (!rateLimit.allowed) {
        console.error(`[API Error] 429 Too Many Requests: ${"429 Too Many Requests"}`);
      return NextResponse.json({ error: API_ERRORS.TOO_MANY_REQUESTS }, { status: 429 })
    }

    // Key format: hpsk_<uuid_no_hyphens>_<secret>
    let matchedUserId: string | null = null
    const parts = accessKey.split("_")

    if (parts.length === 3 && parts[0] === "hpsk" && parts[1].length === 32) {
      const rawId = parts[1]
      const extractedId = `${rawId.slice(0, 8)}-${rawId.slice(8, 12)}-${rawId.slice(12, 16)}-${rawId.slice(16, 20)}-${rawId.slice(20)}`

      const user = await getUserForAuthById(extractedId)
      if (user && user.password_hash) {
        if (verifyPassword(accessKey, user.password_hash)) {
          matchedUserId = user.id
        }
      } else {
        verifyPassword(accessKey, DUMMY_HASH)
      }
    } else {
      verifyPassword(accessKey, DUMMY_HASH)
    }

    if (!matchedUserId) {
        console.error(`[API Error] 401 Unauthorized: ${"Invalid access key"}`);
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    await updateLastLogin(matchedUserId)
    const token = generateToken({ userId: matchedUserId })
    await setAuthCookie(token)
    await createUserSession(matchedUserId)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("[Auth] Login error:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to sign in"}`);
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}
