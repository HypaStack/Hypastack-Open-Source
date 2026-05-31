import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyPassword, generateToken, setAuthCookie, hashPassword } from "@/lib/auth"
import { getUserForAuthById, updateLastLogin, createUserSession } from "@/lib/user-model"
import { checkLoginRateLimit } from "@/lib/rate-limit"
import { verifyTurnstileToken } from "@/lib/turnstile"
import { validateCsrfToken } from "@/lib/security"
import { getHashedIp } from "@/lib/ip"

/**
 * Zero-Knowledge Login
 *
 * User enters their access key (hpsk_...) — that's it.
 * Server hashes it and finds the matching user via PBKDF2 verification.
 * No email, no username, no IP, nothing else.
 */

// Pre-computed dummy hash used when the user ID is not found,
// so the timing for non-existent vs wrong-password is indistinguishable.
const DUMMY_HASH = hashPassword("hpsk_0000000000000000000000000000000000000000_dummy").hash

const LoginSchema = z.object({
  accessKey: z.string().min(1, "Access key is required"),
  turnstileToken: z.string().min(1, "Turnstile token required"),
  csrfToken: z.string().min(1, "CSRF token required"),
})

export async function handleLoginPost(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validation = LoginSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { accessKey, turnstileToken, csrfToken } = validation.data

    // Verify CSRF token
    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
      return NextResponse.json(
        { error: "Invalid security token. Please refresh the page and try again." },
        { status: 403 }
      )
    }

    // Verify Turnstile token (bot protection)
    if (process.env.NODE_ENV !== "development") {
      const turnstileResult = await verifyTurnstileToken(turnstileToken)
      if (!turnstileResult.success) {
        return NextResponse.json(
          { error: turnstileResult.error || "Security verification failed" },
          { status: 403 }
        )
      }
    }

    // Rate limit by hashed IP — prevents prefix-rotation bypass
    const hashedIp = getHashedIp(request)
    const rateLimit = await checkLoginRateLimit(hashedIp)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit reached, try again later" },
        { status: 429 }
      )
    }

    // Find user by verifying the access key
    // Key format: hpsk_<uuid_no_hyphens>_<secret> → O(1) direct lookup
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
        // Run dummy compare to prevent timing oracle — "user not found" and
        // "wrong password" paths should take the same wall-clock time.
        verifyPassword(accessKey, DUMMY_HASH)
      }
    } else {
      // Malformed key — still run a dummy compare to equalise timing
      verifyPassword(accessKey, DUMMY_HASH)
    }

    if (!matchedUserId) {
      return NextResponse.json(
        { error: "Invalid access key" },
        { status: 401 }
      )
    }

    // Update last login
    await updateLastLogin(matchedUserId)

    // Generate JWT token — zero-knowledge: userId only
    const token = generateToken({ userId: matchedUserId })

    // Set auth cookie
    await setAuthCookie(token)

    // Create session
    await createUserSession(matchedUserId)

    return NextResponse.json({
      success: true,
    })

  } catch (error) {
    console.error("[Auth] Login error:", error)
    return NextResponse.json(
      { error: "Failed to sign in" },
      { status: 500 }
    )
  }
}
