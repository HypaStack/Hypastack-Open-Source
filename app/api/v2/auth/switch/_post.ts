import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { z } from "zod"
import { apiError } from "@/lib/http/apiError"
import { generateToken, setAuthCookie, setRefreshCookie } from "@/lib/security/auth"
import { readAccounts, forgetAccount, rememberAccount } from "@/lib/security/accountsCookie"
import { getLiveSessionByRefreshHash, getUserForAuthById, isOwner, updateLastLogin } from "@/lib/models/userModel"
import { validateCsrfToken } from "@/lib/security/security"
import { rejectIfBlacklisted, enforceOwnerIpGate } from "@/lib/security/ownerGate"
import { API_ERRORS } from "@/constants"

const SwitchSchema = z.object({
  userId: z.string().min(1),
  csrfToken: z.string().min(1, "CSRF Token not found"),
})

// Resumes a session the browser already holds. Every gate login runs has to run
// here too, otherwise switching would be a way around them.
export async function POST(request: NextRequest) {
  try {
    const blacklisted = await rejectIfBlacklisted(request)
    if (blacklisted) return blacklisted

    const validation = SwitchSchema.safeParse(await request.json())
    if (!validation.success) {
      return apiError(400, API_ERRORS.BAD_REQUEST, validation.error.issues[0].message)
    }
    const { userId, csrfToken } = validation.data

    if (!(await validateCsrfToken(csrfToken))) {
      return apiError(403, API_ERRORS.FORBIDDEN, "Invalid csrf token, try again.")
    }

    const stashed = (await readAccounts()).find((a) => a.userId === userId)
    if (!stashed) {
      return apiError(401, API_ERRORS.UNAUTHORIZED, "Not signed in on that account")
    }

    // The cookie names an account, it doesn't prove anything. The refresh token
    // has to still match a live session row for that exact user.
    const refreshTokenHash = crypto.createHash("sha256").update(stashed.refreshToken).digest("hex")
    const session = await getLiveSessionByRefreshHash(userId, refreshTokenHash)
    if (!session) {
      await forgetAccount(userId)
      return apiError(401, API_ERRORS.UNAUTHORIZED, "That session has expired, sign in again")
    }

    const user = await getUserForAuthById(userId)
    if (!user) {
      await forgetAccount(userId)
      return apiError(404, API_ERRORS.NOT_FOUND, "Account no longer exists")
    }
    if (user.suspended) {
      return apiError(403, API_ERRORS.FORBIDDEN, "Account suspended")
    }

    if (await isOwner(userId)) {
      const ownerGate = await enforceOwnerIpGate(request)
      if (ownerGate) return ownerGate
    }

    await updateLastLogin(userId)
    await setAuthCookie(generateToken({ userId, sessionId: session.id }))
    await setRefreshCookie(stashed.refreshToken)
    // move it to the front so the switcher lists most-recently-used first
    await rememberAccount(userId, stashed.refreshToken)

    return NextResponse.json({ success: true, userId })
  } catch (error) {
    console.error("[Auth] Switch error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to switch account")
  }
}
