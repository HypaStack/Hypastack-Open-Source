import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { apiError } from "@/lib/http/apiError"
import { clearAuthCookie, clearRefreshCookie, getCurrentUser } from "@/lib/security/auth"
import { readAccounts, forgetAccount } from "@/lib/security/accountsCookie"
import { activateStashedAccount, hashRefreshToken } from "@/lib/security/accountSwitch"
import { getLiveSessionByRefreshHash, revokeSession } from "@/lib/models/userModel"
import { validateCsrfToken } from "@/lib/security/security"
import { checkAccountSwitchRateLimit } from "@/lib/data/rateLimit"
import { getHashedIp } from "@/lib/http/ip"
import { bustCache } from "@/lib/data/cache"
import { API_ERRORS } from "@/constants"

const SignOutSchema = z.object({
  userId: z.string().min(1),
  csrfToken: z.string().min(1, "CSRF Token not found"),
})

// Signs out one listed account, which may or may not be the one in use. Signing
// out the active one hands the session to whoever is left rather than dumping
// the user on the login page.
export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkAccountSwitchRateLimit(getHashedIp(request))
    if (!rateLimit.allowed) {
      return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "rate limit exceeded")
    }

    const validation = SignOutSchema.safeParse(await request.json())
    if (!validation.success) {
      return apiError(400, API_ERRORS.BAD_REQUEST, validation.error.issues[0].message)
    }
    const { userId, csrfToken } = validation.data

    if (!(await validateCsrfToken(csrfToken))) {
      return apiError(403, API_ERRORS.FORBIDDEN, "Invalid csrf token, try again.")
    }

    const target = (await readAccounts()).find((a) => a.userId === userId)
    if (!target) {
      return apiError(401, API_ERRORS.UNAUTHORIZED, "Not signed in on that account")
    }

    // Kill the session server-side so the refresh token dies with it, not just
    // the local roster entry.
    const session = await getLiveSessionByRefreshHash(userId, hashRefreshToken(target.refreshToken))
    if (session) {
      await revokeSession(session.id)
      await bustCache(`session:${session.id}:revoked`)
    }
    await forgetAccount(userId)

    const current = await getCurrentUser(request)
    if (current && current.userId !== userId) {
      // signed out somebody else, the active session is untouched
      return NextResponse.json({ success: true, next: null, stillSignedIn: true })
    }

    // They signed themselves out. Hand over to the first account still standing,
    // skipping any that can't be activated (expired, suspended, IP-gated).
    for (const candidate of await readAccounts()) {
      const failure = await activateStashedAccount(request, candidate)
      if (!failure) {
        return NextResponse.json({ success: true, next: candidate.userId, stillSignedIn: true })
      }
    }

    await clearAuthCookie()
    await clearRefreshCookie()
    return NextResponse.json({ success: true, next: null, stillSignedIn: false })
  } catch (error) {
    console.error("[Auth] Account signout error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to sign out")
  }
}
